import type { Knex } from 'knex';

const chartHistoryFunction = `
    CREATE OR REPLACE FUNCTION public.get_chart_history(
      p_start TIMESTAMP WITH TIME ZONE,
      p_end TIMESTAMP WITH TIME ZONE
    )
    RETURNS JSONB
    LANGUAGE SQL
    STABLE
    SECURITY INVOKER
    SET search_path = public
    AS $$
      WITH requested AS (
        SELECT least(p_end, now()) AS end_at
      ),
      bounds AS (
        SELECT
          requested.end_at,
          greatest(p_start, requested.end_at - INTERVAL '31 days') AS start_at
        FROM requested
      ),
      filtered AS (
        SELECT measures.*
        FROM measures, bounds
        WHERE measured_at >= bounds.start_at
          AND measured_at <= bounds.end_at
      ),
      bucketed AS (
        SELECT
          filtered.*,
          count(*) OVER (PARTITION BY device_name) > 1800 AS is_downsampled,
          date_bin(
            greatest(
              (bounds.end_at - bounds.start_at) / 150,
              INTERVAL '1 microsecond'
            ),
            measured_at,
            bounds.start_at
          ) AS bucket_label
        FROM filtered, bounds
      ),
      ranked AS (
        SELECT
          bucketed.*,
          row_number() OVER (
            PARTITION BY device_name, bucket_label
            ORDER BY temperature, measured_at
          ) AS temperature_low_rank,
          row_number() OVER (
            PARTITION BY device_name, bucket_label
            ORDER BY temperature DESC, measured_at
          ) AS temperature_high_rank,
          row_number() OVER (
            PARTITION BY device_name, bucket_label
            ORDER BY humidity, measured_at
          ) AS humidity_low_rank,
          row_number() OVER (
            PARTITION BY device_name, bucket_label
            ORDER BY humidity DESC, measured_at
          ) AS humidity_high_rank,
          row_number() OVER (
            PARTITION BY device_name, bucket_label
            ORDER BY dew_point, measured_at
          ) AS dew_point_low_rank,
          row_number() OVER (
            PARTITION BY device_name, bucket_label
            ORDER BY dew_point DESC, measured_at
          ) AS dew_point_high_rank
        FROM bucketed
      ),
      selected AS (
        SELECT *
        FROM filtered
        WHERE id IN (
          SELECT id
          FROM ranked
          WHERE NOT is_downsampled
            OR temperature_low_rank = 1
            OR temperature_high_rank = 1
            OR humidity_low_rank = 1
            OR humidity_high_rank = 1
            OR dew_point_low_rank = 1
            OR dew_point_high_rank = 1
        )
      ),
      grouped AS (
        SELECT
          device_name,
          jsonb_agg(to_jsonb(selected) ORDER BY measured_at) AS measures
        FROM selected
        GROUP BY device_name
      )
      SELECT COALESCE(
        jsonb_object_agg(device_name, measures ORDER BY device_name),
        '{}'::JSONB
      )
      FROM grouped;
    $$;
`;

const chartHistoryFunctionByDeviceType = `
    CREATE OR REPLACE FUNCTION public.get_chart_history(
      p_start TIMESTAMP WITH TIME ZONE,
      p_end TIMESTAMP WITH TIME ZONE
    )
    RETURNS JSONB
    LANGUAGE SQL
    STABLE
    SECURITY INVOKER
    SET search_path = public
    AS $$
      WITH requested AS (
        SELECT least(p_end, now()) AS end_at
      ),
      bounds AS (
        SELECT
          requested.end_at,
          greatest(p_start, requested.end_at - INTERVAL '31 days') AS start_at
        FROM requested
      ),
      filtered AS (
        SELECT measures.*
        FROM measures, bounds
        WHERE device_type IN ('indoor', 'outdoor')
          AND measured_at >= bounds.start_at
          AND measured_at <= bounds.end_at
      ),
      bucketed AS (
        SELECT
          filtered.*,
          count(*) OVER (PARTITION BY device_type) > 1800 AS is_downsampled,
          date_bin(
            greatest(
              (bounds.end_at - bounds.start_at) / 150,
              INTERVAL '1 microsecond'
            ),
            measured_at,
            bounds.start_at
          ) AS bucket_label
        FROM filtered, bounds
      ),
      ranked AS (
        SELECT
          bucketed.*,
          row_number() OVER (
            PARTITION BY device_type, bucket_label
            ORDER BY temperature, measured_at
          ) AS temperature_low_rank,
          row_number() OVER (
            PARTITION BY device_type, bucket_label
            ORDER BY temperature DESC, measured_at
          ) AS temperature_high_rank,
          row_number() OVER (
            PARTITION BY device_type, bucket_label
            ORDER BY humidity, measured_at
          ) AS humidity_low_rank,
          row_number() OVER (
            PARTITION BY device_type, bucket_label
            ORDER BY humidity DESC, measured_at
          ) AS humidity_high_rank,
          row_number() OVER (
            PARTITION BY device_type, bucket_label
            ORDER BY dew_point, measured_at
          ) AS dew_point_low_rank,
          row_number() OVER (
            PARTITION BY device_type, bucket_label
            ORDER BY dew_point DESC, measured_at
          ) AS dew_point_high_rank
        FROM bucketed
      ),
      selected AS (
        SELECT *
        FROM filtered
        WHERE id IN (
          SELECT id
          FROM ranked
          WHERE NOT is_downsampled
            OR temperature_low_rank = 1
            OR temperature_high_rank = 1
            OR humidity_low_rank = 1
            OR humidity_high_rank = 1
            OR dew_point_low_rank = 1
            OR dew_point_high_rank = 1
        )
      )
      SELECT jsonb_build_object(
        'indoor',
        COALESCE(
          jsonb_agg(to_jsonb(selected) ORDER BY measured_at)
            FILTER (WHERE device_type = 'indoor'),
          '[]'::JSONB
        ),
        'outdoor',
        COALESCE(
          jsonb_agg(to_jsonb(selected) ORDER BY measured_at)
            FILTER (WHERE device_type = 'outdoor'),
          '[]'::JSONB
        )
      )
      FROM selected;
    $$;
`;

export async function up(knex: Knex): Promise<void> {
  await knex.raw(chartHistoryFunction);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(chartHistoryFunctionByDeviceType);
}

import type { Knex } from 'knex';

const assertDevelopment = (): void => {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('The local measure seed requires NODE_ENV=development');
  }
};

const seedMeasures = async (knex: Knex): Promise<number | string> => {
  assertDevelopment();

  const { environment } = await import('#environment.ts');
  const outdoorMeter = environment.DEVICES.find(
    (meter) => meter.type === 'outdoor',
  );
  const indoorMeter = environment.DEVICES.find(
    (meter) => meter.type === 'indoor',
  );

  if (!outdoorMeter || !indoorMeter) {
    throw new Error('DEVICES must contain one indoor and one outdoor meter');
  }

  return knex.transaction(async (transaction) => {
    await transaction.raw('TRUNCATE measures;');

    await transaction.raw(
      `
        WITH instants AS (
          SELECT
            measured_at,
            sin(
              2 * pi() * (extract(doy FROM measured_at) - 109) / 365.25
            ) AS seasonal_cycle,
            sin(
              2 * pi() * (
                extract(hour FROM measured_at)
                + extract(minute FROM measured_at) / 60
                - 8
              ) / 24
            ) AS daily_cycle,
            extract(epoch FROM measured_at) AS measured_at_epoch
          FROM generate_series(
            now() - interval '1 year',
            now(),
            interval '5 minutes'
          ) AS series(measured_at)
        ),
        outdoor AS (
          SELECT
            measured_at,
            round(
              (
                16.2
                + 8.8 * seasonal_cycle
                + 4.5 * daily_cycle
                + 1.2 * sin(
                  2 * pi() * measured_at_epoch / (4 * 24 * 60 * 60)
                )
                + 0.25 * sin(
                  2 * pi() * (measured_at_epoch / (2 * 60 * 60) + 0.17)
                )
              )::numeric,
              1
            ) AS temperature,
            round(
              greatest(
                25,
                least(
                  92,
                  70
                    - 14 * seasonal_cycle
                    - 10 * daily_cycle
                    + 6 * sin(
                      2 * pi() * (measured_at_epoch / (4 * 24 * 60 * 60) + 0.4)
                    )
                    + 3 * sin(
                      2 * pi() * (measured_at_epoch / (60 * 60) + 0.1)
                    )
                )
              )
            )::integer AS humidity,
            measured_at_epoch
          FROM instants
        ),
        indoor AS (
          SELECT
            measured_at,
            round(
              (
                21
                + 0.18 * (temperature - 16.2)
                + 0.4 * sin(
                  2 * pi() * (
                    extract(hour FROM measured_at)
                    + extract(minute FROM measured_at) / 60
                    - 8
                  ) / 24
                )
                + 0.12 * sin(
                  2 * pi() * (measured_at_epoch / (3 * 60 * 60) + 0.35)
                )
              )::numeric,
              1
            ) AS temperature,
            round(
              greatest(
                35,
                least(
                  65,
                  45
                    + 0.15 * (humidity - 55)
                    + 2 * sin(
                      2 * pi() * (measured_at_epoch / (2 * 60 * 60) + 0.7)
                    )
                )
              )
            )::integer AS humidity
          FROM outdoor
        ),
        readings AS (
          SELECT
            ?::text AS device_id,
            ?::text AS address,
            'outdoor'::text AS device_type,
            measured_at,
            temperature,
            humidity
          FROM outdoor
          UNION ALL
          SELECT
            ?::text AS device_id,
            ?::text AS address,
            'indoor'::text AS device_type,
            measured_at,
            temperature,
            humidity
          FROM indoor
        ),
        heat_index AS (
          SELECT
            *,
            temperature * 9 / 5 + 32 AS temperature_fahrenheit,
            0.5 * (
              temperature * 9 / 5 + 32
              + 61
              + (temperature * 9 / 5 + 32 - 68) * 1.2
              + humidity * 0.094
            ) AS simple_heat_index
          FROM readings
        ),
        calculated AS (
          SELECT
            *,
            (simple_heat_index + temperature_fahrenheit) / 2
              AS initial_heat_index
          FROM heat_index
        )
        INSERT INTO measures (
          device_id,
          address,
          device_type,
          temperature,
          dew_point,
          heat_index,
          humidity,
          battery,
          signal_power_dbm,
          measured_at
        )
        SELECT
          device_id,
          address,
          device_type,
          temperature,
          round(
            (
              (
                243.12 * (
                  ln(humidity / 100.0)
                  + (17.62 * temperature) / (243.12 + temperature)
                )
              ) / (
                17.62 - (
                  ln(humidity / 100.0)
                  + (17.62 * temperature) / (243.12 + temperature)
                )
              )
            )::numeric,
            1
          ) AS dew_point,
          round(
            (
              CASE
                WHEN initial_heat_index < 80 THEN initial_heat_index
                ELSE
                  -42.379
                  + 2.04901523 * temperature_fahrenheit
                  + 10.14333127 * humidity
                  - 0.22475541 * temperature_fahrenheit * humidity
                  - 0.00683783 * temperature_fahrenheit ^ 2
                  - 0.05481717 * humidity ^ 2
                  + 0.00122874 * temperature_fahrenheit ^ 2 * humidity
                  + 0.00085282 * temperature_fahrenheit * humidity ^ 2
                  - 0.00000199 * temperature_fahrenheit ^ 2 * humidity ^ 2
                  + CASE
                      WHEN humidity < 13
                        AND temperature_fahrenheit >= 80
                        AND temperature_fahrenheit <= 112
                        THEN -((13 - humidity) / 4)
                          * sqrt(
                            (17 - abs(temperature_fahrenheit - 95)) / 17
                          )
                      WHEN humidity > 85
                        AND temperature_fahrenheit >= 80
                        AND temperature_fahrenheit <= 87
                        THEN ((humidity - 85) / 10)
                          * ((87 - temperature_fahrenheit) / 5)
                      ELSE 0
                    END
              END
            )::numeric,
            1
          ) AS heat_index,
          humidity,
          100 AS battery,
          -70 AS signal_power_dbm,
          measured_at
        FROM calculated;
      `,
      [
        outdoorMeter.deviceId,
        outdoorMeter.address,
        indoorMeter.deviceId,
        indoorMeter.address,
      ],
    );

    const [{ count }] = await transaction('measures').count('id as count');
    return count;
  });
};

export async function seed(knex: Knex): Promise<void> {
  const count = await seedMeasures(knex);
  console.log(`Inserted ${count} measures.`);
}

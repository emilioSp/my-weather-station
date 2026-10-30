// Validate static and interpolated Playwright test titles during linting.

const isTestCallee = (callee) => {
  if (callee.type === 'Identifier') return callee.name === 'test';

  return (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    ['only', 'skip', 'fixme', 'fail', 'slow'].includes(callee.property.name) &&
    isTestCallee(callee.object)
  );
};

const getTitleText = (title) => {
  if (title?.type === 'Literal') return title.value;

  if (title?.type === 'TemplateLiteral') {
    // Check the written structure, not runtime values of interpolated expressions.
    return title.quasis.map(({ value }) => value.cooked ?? value.raw).join('${value}');
  }

  return null;
};

export default {
  rules: {
    'valid-title': {
      meta: {
        type: 'problem',
        schema: {
          type: 'array',
          items: [{ type: 'string' }],
          minItems: 1,
          maxItems: 1,
        },
        messages: {
          invalidTitle: 'Test titles must match {{pattern}}.',
        },
      },
      create: (context) => {
        const pattern = new RegExp(context.options[0], 'u');

        return {
          CallExpression: (node) => {
            const title = node.arguments[0];

            if (!isTestCallee(node.callee)) return;

            const titleText = getTitleText(title);

            if (titleText === null) return;

            if (!pattern.test(titleText)) {
              context.report({ node: title, messageId: 'invalidTitle', data: { pattern } });
            }
          },
        };
      },
    },
  },
};

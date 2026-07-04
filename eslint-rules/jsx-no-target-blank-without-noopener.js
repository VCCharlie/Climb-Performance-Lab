/**
 * Require rel="noopener" (or noreferrer) on <a target="_blank"> — reverse tabnabbing guard.
 */

function isTargetBlank(attr) {
    if (!attr?.value) return false;
    if (attr.value.type === 'Literal') return attr.value.value === '_blank';
    if (attr.value.type === 'JSXExpressionContainer' && attr.value.expression?.type === 'Literal') {
        return attr.value.expression.value === '_blank';
    }
    return false;
}

function hasNoopener(attr) {
    if (!attr?.value) return false;
    let rel = '';
    if (attr.value.type === 'Literal') rel = attr.value.value;
    else if (attr.value.type === 'JSXExpressionContainer' && attr.value.expression?.type === 'Literal') {
        rel = attr.value.expression.value;
    }
    return typeof rel === 'string' && (rel.includes('noopener') || rel.includes('noreferrer'));
}

export const jsxNoTargetBlankWithoutNoopener = {
    meta: {
        type: 'problem',
        docs: {
            description: 'require rel="noopener noreferrer" on links opened with target="_blank"',
        },
        schema: [],
    },
    create(context) {
        return {
            JSXOpeningElement(node) {
                if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'a') return;

                let targetBlank = false;
                let noopener = false;

                for (const attr of node.attributes) {
                    if (attr.type !== 'JSXAttribute') continue;
                    if (attr.name.name === 'target' && isTargetBlank(attr)) targetBlank = true;
                    if (attr.name.name === 'rel' && hasNoopener(attr)) noopener = true;
                }

                if (targetBlank && !noopener) {
                    context.report({
                        node,
                        message: 'Links with target="_blank" must include rel="noopener noreferrer".',
                    });
                }
            },
        };
    },
};

const flattenObjectToString = (obj) => {
    let result = '';

    const traverse = (value) => {
        if (typeof value === 'object' && value !== null) {
            for (const key in value) {
                traverse(value[key]);
            }
        } else {
            result += ` ${value}`;
        }
    };

    traverse(obj);
    return result.toLowerCase();
};

export { flattenObjectToString };

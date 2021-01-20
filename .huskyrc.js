module.exports = {
  hooks: {
    ...require('@jupiterone/typescript-tools/config/husky'),
    "precommit": "yarn rewrite-imports --dir . && lint-staged"
  }
};

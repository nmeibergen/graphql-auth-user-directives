let test = {
  x: 1
};
test = null;

const val = { y: 2 };
test = { ...test, ...val };
console.log(test);

const x = 1;

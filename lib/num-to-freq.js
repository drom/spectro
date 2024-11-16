'use strict';

module.exports = function (f) {
  // return f.toExponential();
//   number.toLocaleString('en-US', {
//     useGrouping: true,
//     maximumFractionDigits: 2
// });
  const pair = (
    (f % 100000000 === 0) ? [f / 1000000000, 'G'] :
      (f % 100000 === 0) ? [f / 1000000, 'M'] :
        (f % 100 === 0) ? [f / 1000, 'K'] : [f, '']
  );
  return pair[0]
    .toLocaleString('en-US', {
      useGrouping: true,
      maximumFractionDigits: 2
    }) + ' ' + pair[1] + 'Hz';
};

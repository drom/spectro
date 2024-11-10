'use strict';

const onml = require('onml');

const numToFreq = require('./num-to-freq');

const cmdList = {
  start: String.fromCharCode(0x8f),
  version: 'v',
  fset: 'f',
  sweep: 'x'
};

const cmdGen = (fmin, fmax, samples) => {
  const span = fmax - fmin;
  const freq = ('000000000' + ((fmin / 10) |0).toString()).slice(-9);
  const step = ('00000000' + (((span / samples) / 10) |0).toString()).slice(-8);
  const smpl = ('0000' + (samples).toString()).slice(-4);
  return cmdList.start + cmdList.sweep + freq + step + smpl;
};

const maxSamples = 512;
const state = {
  fmin: 2.3e9,
  fmax: 2.5e9,
  samples: 512,
  sweep: true,
  filename: Date.now() + '.csv',
  play: false,
  record: false,
  curX: 0,
  tail: Buffer.alloc(4 * maxSamples),
  max16: new Uint16Array(maxSamples * 4), // Buffer.alloc(4 * samples),
  buf: new Uint8Array(maxSamples * 2),
  cur: 0
};

// for (let i = 0; i < state.samples; i++) {
//   state.max16[i] = 100;
// }


const renderer = (root) => {
  const render1 = onml.renderer(root);
  return () => {
    const {width, height} = state;
    const svg = onml.gen.svg(width, height);
    svg.push(['g', onml.tt(.5, .5),
      ...Array.from({length: 11}, (_, y) => ['line', {
        class: 'grid2',
        y1: ((height - 1) * y / 10)|0,
        y2: ((height - 1) * y / 10)|0,
        x1: 0,
        x2: width
      }]),
      ...[0, 1, 2, 3, 4, 6, 7, 8, 9, 10].map((x)  => ['line', {
        class: 'grid2',
        x1: ((width - 1) * x / 10)|0,
        x2: ((width - 1) * x / 10)|0,
        y1: 0,
        y2: height
      }]),
      ...[5].map(x => ['line', {
        class: 'grid1',
        x1: ((width - 1) * x / 10)|0,
        x2: ((width - 1) * x / 10)|0,
        y1: 0,
        y2: height - 24
      }]),
      ...Array.from({length: 9}, (_, i) =>({
        y: ((height - 1) * (i + 1) / 10 + 5)|0,
        l: (i + 1) * -10
      }))
        .flatMap(({y, l}) => [
          ['text', {class: 'text2l', y, x: 8}, l],
          ['text', {class: 'text2r', y, x: width - 8}, l]
        ]),
      ['text', {
        class: 'text2c',
        x: width / 2,
        y: height - 8
      }, numToFreq((state.fmin + state.fmax) / 2)],
      ['text', {
        class: 'text2l',
        x: 8,
        y: height - 8
      }, numToFreq(state.fmin)],
      ['text', {
        class: 'text2r',
        x: width - 8,
        y: height - 8
      }, numToFreq(state.fmax)]
    ]);
    const track = [];
    const view16 = new Uint16Array(state.buf.buffer);
    for (let i = 0; i < (state.cur >> 1); i++) {
      // if (view16[i] > state.max16[i]) {
      //   state.max16[i] = view16[i];
      // }
      track.push(
        (i ? 'L' : 'M'),
        (width * i / state.samples)|0,
        state.height - view16[i] * state.height / 512
      );
    }
    svg.push(['path', {class: 'mline', d: track.join(' ')}]);
    // const maxTrack = [];
    // for (let i = 0; i < state.samples; i++) {
    //   maxTrack.push(
    //     (i ? 'L' : 'M'),
    //     (width * i / state.samples)|0,
    //     state.height - state.max16[i] * state.height / 512
    //   );
    // }
    // svg.push(['path', {class: 'xline', d: maxTrack.join(' ')}]);
    // console.log(width, height, svg);
    render1(svg);
  };
};

const genResizeHandler = (root) => {
  const render = renderer(root);
  let timer;
  let pend;
  return () => {
    if (timer) {
      pend = true;
    } else {
      render();
      timer = true;
      setTimeout(() => {
        timer = false;
        if (pend) {
          render();
          pend = false;
        }
      }, 50);
    }
  };
};

const setupChartView = (root) => {
  const slow = genResizeHandler(root);
  const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
      let {width, height} = entry.contentRect;
      // height = height || 888;
      state.width = width|0;
      state.height = height|0;
      slow();
    }
  });
  resizeObserver.observe(root);
  return slow;
};

window.SPECTRO = (contentDiv) => {
  const content = document.getElementById(contentDiv);
  const btn = document.createElement('button');
  content.append(btn);

  btn.innerHTML = 'CONNECT!';

  navigator.serial.addEventListener('connect', (event) => {
    // Connect to `e.target` or add it to a list of available ports.
    // console.log('connect', event);
  });

  navigator.serial.addEventListener('disconnect', (event) => {
    // Remove `e.target` from the list of available ports.
    // console.log('disconnect', event);
  });

  navigator.serial.getPorts().then((ports) => {
    // Initialize the list of available ports with `ports` on page load.
    // console.log('ports', ports);
  });

  btn.addEventListener('click', async () => {
    const port = await navigator.serial.requestPort({ filters: [{ usbVendorId: 0x0403}] });
    const refresh = setupChartView(content);
    // console.log(port);
    await port.open({ baudRate: 57600 });
    // console.log(port);
    for (let i = 0; i < 10000000; i++) {
      // console.log(i);
      state.cur = 0;
      const cmd = cmdGen(state.fmin, state.fmax, state.samples);
      const encoder = new TextEncoder();
      const writer = port.writable.getWriter();
      writer.write(encoder.encode(cmd));
      writer.releaseLock();
      // while (port.readable) {
      const reader = port.readable.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            // console.log('DONEDONEDONEDONEDONEDONEDONEDONE');
            // |reader| has been canceled.
            break;
          }
          // Do something with |value|...
          state.buf.set(value, state.cur);
          state.cur += value.length;
          // console.log(state.cur);
          refresh();
          if (state.cur === 2 * state.samples) {
            // console.log('?????????????????????????????');
            break;
          }
        }
      } catch (error) {
        // Handle |error|...
      } finally {
        reader.releaseLock();
      }
      // reader.releaseLock();
      // const view16 = new Uint16Array(state.buf.buffer);
      // for (let i = 0; i < state.samples; i++) {
      //   state.max16[i] = Math.max(state.max16[i], view16[i]);
      // }
    }
    // console.log(, state.max16);
    // }
  });
};

window.fmin = (val) => { state.fmin = val; };
window.fmax = (val) => { state.fmax = val; };
window.points = (val) => { state.samples = val; };

/* eslint-env browser */

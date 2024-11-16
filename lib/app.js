'use strict';

const onml = require('onml');

const pkg = require('../package.json');
const mlGrid = require('./ml-grid.js');
const numToFreq = require('./num-to-freq');

const $cmd = {
  start: String.fromCharCode(0x8f),

  /*
    ("%09d%08d%04d", frequency, stepSize, numSamples) -> (N * uint16)
    Receive in log (power) mode
  */
  sweep: 'x',

  /*
    ("%09d%08d%04d", frequency, stepSize, numSamples) -> (N * uint16)
    Receive in linear (power) mode
  */
  lsweep: 'w',

  /*
    ("%09d", frequency) -> ()
    CW frequency transmission
  */
  fset: 'f',

  /*
    () -> (Byte)
    Get firmware version
  */
  version: 'v',

  /*
    (uint16) -> ()
    Set attenuation level
  */
  att: 'r'
  /*
    m/n   ???                   ???           ???
    s     Get the status        No arguments  Version/atten/???
    e     Frequency correction  ???           None
  */
};

const cmdSweep = (fmin, fmax, samples) => {
  const span = fmax - fmin;
  const freq = Math.round(fmin / 10).toString().padStart(9, '0');
  const step = Math.round(span / samples / 5).toString().padStart(8, '0');
  const smpl = (samples / 2).toString().padStart(4, '0');
  return $cmd.start + $cmd.sweep + freq + step + smpl;
};

const maxSamples = 0x100000;

const state = {
  fmin: 850e6,
  fmax: 900e6,
  taskQueue: [],
  nextSamples: 1000,
  samples: 1000,
  cursorX: 0,
  cursorY: 0,
  // sweep: true,
  // filename: Date.now() + '.csv',
  // play: false,
  // record: false,
  // curX: 0,
  // tail: Buffer.alloc(4 * maxSamples),
  // max16: new Uint16Array(maxSamples * 4), // Buffer.alloc(4 * samples),
  buf: new Uint8Array(maxSamples * 2),
  maxBuf: new Uint8Array(maxSamples * 2),
  cur: 0
};

state.buf16 = new Uint16Array(state.buf.buffer);
state.maxBuf16 = new Uint16Array(state.maxBuf.buffer);

// for (let i = 0; i < state.samples; i++) {
//   state.max16[i] = 100;
// }

const renderer = (root) => {
  const render1 = onml.renderer(root);
  return () => {
    const {width, height, fmin, fmax} = state;
    const svg = onml.gen.svg(width, height);
    svg.push(mlGrid(width, height, fmin, fmax));
    const track = [];
    for (let i = 0; i < (state.cur >> 1); i++) {
      track.push(
        (i ? 'L' : 'M'),
        (width * i / state.samples)|0,
        state.height - state.buf16[i] * state.height / 512
      );
    }
    const maxTrack = [];
    for (let i = 0; i < state.samples; i++) {
      maxTrack.push(
        (i ? 'L' : 'M'),
        (width * i / state.samples)|0,
        state.height - state.maxBuf16[i] * state.height / 512
      );
    }
    const cursorLevel = state.cursorY / state.height * -100;
    const cursorFreq = numToFreq(state.cursorX / state.width * (state.fmax - state.fmin) + state.fmin);
    svg.push(
      ['path', {class: 'xline', d: maxTrack.join(' ')}],
      ['path', {class: 'mline', d: track.join(' ')}],
      ['line', {class: 'cursor', x1: 0, x2: state.width, y1: state.cursorY, y2: state.cursorY}],
      ['line', {class: 'cursor', x1: state.cursorX, x2: state.cursorX, y1: 0, y2: state.height}],
      ['text', {class: 'text2lb', x: 32, y: state.cursorY + 7}, cursorLevel.toPrecision(4)],
      ['text', {class: 'text2rb', x: state.width - 32, y: state.cursorY + 7}, cursorLevel.toPrecision(4)],
      ['text', {class: 'text2cb', x: state.cursorX, y: 24}, cursorFreq],
      ['text', {class: 'text2cb', x: state.cursorX, y: state.height - 26}, cursorFreq],
    );
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
      }, 100);
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
  root.addEventListener('mousemove', (event) => {
    state.cursorX = event.clientX - 8;
    state.cursorY = event.clientY - 8;
  });
  return slow;
};

window.SPECTRO = (contentDiv) => {
  console.log(pkg.name, pkg.version, pkg.timestamp);
  const content = document.getElementById(contentDiv);
  const btn = document.createElement('button');
  content.append(btn);

  btn.innerHTML = 'CONNECT!';

  navigator.serial.addEventListener('connect', (/* event */) => {
    // Connect to `e.target` or add it to a list of available ports.
    // console.log('connect', event);
  });

  navigator.serial.addEventListener('disconnect', (/* event */) => {
    // Remove `e.target` from the list of available ports.
    // console.log('disconnect', event);
  });

  navigator.serial.getPorts().then((/* ports */) => {
    // Initialize the list of available ports with `ports` on page load.
    // console.log('ports', ports);
  });

  btn.addEventListener('click', async () => {
    const port = await navigator.serial.requestPort({ filters: [{ usbVendorId: 0x0403}] });
    const refresh = setupChartView(content);
    // console.log(port);
    await port.open({ baudRate: 57600 });
    // console.log(port);
    const writer = port.writable.getWriter();
    const reader = port.readable.getReader();
    for (let i = 0; i < 10000000; i++) {
      // console.log(i);
      state.cur = 0;
      state.samples = state.nextSamples;
      const cmd = cmdSweep(state.fmin, state.fmax, state.samples);
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(cmd));
      // writer.releaseLock();
      // while (port.readable) {
      try {
        for (let j = 0; j < 10000; j++) {
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
      } catch (err) {
        console.error(err);
        // Handle |error|...
      } finally {
        // reader.releaseLock();
      }

      for (let i = 0; i < state.samples; i++) {
        if (state.buf16[i] > state.maxBuf16[i]) {
          state.maxBuf16[i] = state.buf16[i];
        }
      }
      // reader.releaseLock();
      // const view16 = new Uint16Array(state.buf.buffer);
      // for (let i = 0; i < state.samples; i++) {
      //   state.max16[i] = Math.max(state.max16[i], view16[i]);
      // }
      for (let j = 0; j < 100; j++) {
        if (state.taskQueue.length > 0) {
          const task = state.taskQueue.shift();
          if (task.cmd === 'att') {
            // const cmd = cmdSweep(state.fmin, state.fmax, state.samples);
            // const encoder = new TextEncoder();
            console.log(task.val);
            await writer.write(task.val);
          } else if (task.cmd === 'cleanMax') {
            state.maxBuf.fill(0);
          } else {
            console.error('unknown task', task);
          }
        }
      }
    }
    // console.log(, state.max16);
    // }
  });
};

window.fmin = (val) => {
  if ((typeof val !== 'number') || (val <= 0)) {
    return 'expected positive number';
  }
  state.taskQueue.push({cmd: 'cleanMax'});
  state.fmin = val;
  return cmdSweep(state.fmin, state.fmax, state.samples);
};

window.fmax = (val) => {
  if ((typeof val !== 'number') || (val <= 0)) {
    return 'expected positive number';
  }
  state.taskQueue.push({cmd: 'cleanMax'});
  state.fmax = val;
  return cmdSweep(state.fmin, state.fmax, state.samples);
};

window.center = (val) => {
  if ((typeof val !== 'number') || (val <= 0)) {
    return 'expected positive number';
  }
  state.taskQueue.push({cmd: 'cleanMax'});
  const fspan = state.fmax - state.fmin;
  state.fmin = val - fspan / 2;
  state.fmax = val + fspan / 2;
  return cmdSweep(state.fmin, state.fmax, state.samples);
};

window.span = (val) => {
  if ((typeof val !== 'number') || (val < (state.samples * 5))) {
    return 'expected positive number >= 5 * samples';
  }
  state.taskQueue.push({cmd: 'cleanMax'});
  const fcenter = (state.fmin + state.fmax) / 2;
  state.fmin = fcenter - val / 2;
  state.fmax = fcenter + val / 2;
  return cmdSweep(state.fmin, state.fmax, state.samples);
};

window.points = (val) => {
  if ((typeof val !== 'number') || (val < 10) || (val > 19998)) {
    return 'expected integer number 10...19998';
  }
  state.taskQueue.push({cmd: 'cleanMax'});
  state.nextSamples = Math.round(val);
  return cmdSweep(state.fmin, state.fmax, state.nextSamples);
};

window.att = (val) => {
  if ((typeof val !== 'number') || (val < 0)) {
    return 'expected non-negative number';
  }
  state.taskQueue.push({cmd: 'cleanMax'});
  state.taskQueue.push({
    cmd: 'att',
    val: new Uint8Array([0x8f, $cmd.att.charCodeAt(0), val & 0xff, (val >> 8) & 0xff])
  });
};

/* eslint-env browser */

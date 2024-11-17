Spectrum Analyzer Web UI

## Supported HW

NWTxxxx style USB-Serial FTDI connected spectrum analyzers.

|tested| name | frequency range | | |
|-|-|-|-|-|
|+| NWT6000A  | 25..6000M  |
|+| NWT4000-2 | 35..4400M  |
|+| NWT4000-1 | 138..4400M |
| | NWT???    | |


## Usage

* Go to https://spectro.drom.io
* Open Browser console (F12)
* Press <button>CONNECT!</button> button
* Open browser console <kbd>F12</kbd>
* run commands to control spectrum analyzer

## Commands

`center(freq)` - set center frequency [Hz]

`span(freq)` - set sweep span [Hz]

`points(num)` - set number pf points in each sweep

`fmin(freq)` - set start frequency for a sweep

`fmax(freq)` - set stop frequency for a sweep

`getcalibr()` - read current calibration parameters

`setcalibr(m, b)` - set new level calibration parameters. `y = x * m + b`


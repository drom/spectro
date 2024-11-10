'use strict';

window.SPECTRO = (contentDiv) => {
  const content = document.getElementById(contentDiv);

  const buttonDiv = document.createElement('div');
  content.append(buttonDiv);

  buttonDiv.innerHTML = 'CONNECT!';
};

/* eslint-env browser */

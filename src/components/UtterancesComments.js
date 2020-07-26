import React from 'react'

export const UtterancesComments = () => (
    <section
      ref={elem => {
        if (!elem) {
          return;
        }
        const scriptElem = document.createElement("script");
        scriptElem.src = "https://utteranc.es/client.js";
        scriptElem.async = true;
        scriptElem.crossOrigin = "anonymous";
        scriptElem.setAttribute("repo", "marcingolenia/mcode");
        scriptElem.setAttribute("issue-term", "title");
        scriptElem.setAttribute("theme", "github-light");
        scriptElem.setAttribute("crossorigin", "anonymous")
        elem.appendChild(scriptElem);
      }}
    />
  );

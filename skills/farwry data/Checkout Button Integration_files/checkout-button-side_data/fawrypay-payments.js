const injectedOrigin = "__FP_PLUGIN_ORIGIN__";
const origin =
  injectedOrigin.startsWith("http")
    ? injectedOrigin
    : window.location.origin;

  const fawrypay_api_base_url = "https://atfawry.fawrystaging.com/fawrypay-api/api";
  const fawry_plugin_origin = "https://atfawry.fawrystaging.com";
  const fawryplugin_deploy_path = "/atfawry/plugin/";
  const fawryplugin_frame_div_id = "fawry-payments";

  const DISPLAY_MODE = {
	POPUP: "POPUP",
	INSIDE_PAGE: "INSIDE_PAGE",
	SIDE_PAGE: "SIDE_PAGE",
	SEPARATED: "SEPARATED",
  };

  const translations = {};
  let currentLocale = "en";

  async function initTranslations(locale) {
    currentLocale = locale || "en";

    if (!translations[currentLocale]) {
      const response = await fetch(
        `${fawry_plugin_origin}/atfawry/plugin/assets/i18n/${currentLocale}.json`
      );

      translations[currentLocale] = await response.json();
    }
  }

  function translate(key) {
    return translations[currentLocale]?.[key] || key;
  }

  class FawryPay {

	static async checkout(chargeRequest, config, accessToken) {
    await initTranslations(config.locale);
    config.returnUrl = chargeRequest.returnUrl;
	  FawryPay.config = config;

	  const isMac = navigator.userAgent.match(/Mac OS/);
	  const isAppleProduct =
		navigator.vendor.indexOf("Apple") > -1 || window.safari !== undefined;

	  if (isMac || isAppleProduct) {
		config.mode = DISPLAY_MODE.SEPARATED;
		chargeRequest.displayMode = DISPLAY_MODE.SEPARATED;
	  }

	  chargeRequest.paymentSource =
		chargeRequest.paymentSource && chargeRequest.paymentSource !== ""
		  ? chargeRequest.paymentSource
		  : "NEW_PLUGIN";

	  this.captureOrderInfo(chargeRequest, config, accessToken);
	}

	static captureOrderInfo(chargeRequest, config, accessToken) {

	  var div =
		document.getElementById(fawryplugin_frame_div_id) || FawryPay.createDiv();

	  div.innerHTML = translate("loading-message")

	  document.body.appendChild(div);

	  const params = {
		headers: {
		  Accept: "application/json, text/plain, */*",
		  "Content-Type": "application/json;charset=utf-8",
		  Authorization: accessToken && "Bearer " + accessToken,
		},
		body: JSON.stringify(chargeRequest),
		method: "POST",
	  };

	  fetch(`${fawrypay_api_base_url}/payments/init`, params)

		.then((response) => {
		  if (!response.ok) throw response;
		  return response.text();
		})

		.then(paymentId => {

		  if (paymentId.startsWith("http")) {
			const urlParams = getAllUrlParams(paymentId);
			paymentId = urlParams['payment-id'];
		  }

		  FawryPay.loadPlugin(paymentId, config);

		})

		.catch(error => {

		  div.innerHTML = null;

		  if (typeof error.json === "function") {

			error.json()
			  .then((body) => {
				onFailureCallBack(body);
			  })

		  } else {

			onFailureCallBack({ statusDescription: 'Connection refused!' });

		  }

		});

	}

  static loadPlugin(paymentId, config) {
    const url = `${
      fawry_plugin_origin + fawryplugin_deploy_path
    }?payment-id=${paymentId}&locale=${config.locale || "en"}&mode=${
      config.mode || DISPLAY_MODE.SEPARATED
    }`;
    const style = FawryPay.getIframStyleBasedOnMode(config.mode);

    if (config.mode == DISPLAY_MODE.SEPARATED || config.mode == null) {
      window.open(url, "_self");
    } else if (config.mode === DISPLAY_MODE.POPUP) {
      var div =
        document.getElementById(fawryplugin_frame_div_id) ||
        FawryPay.createDiv();
      div.innerHTML = `<div id="id01" class="modal-f">
    <div class="modal_content">
     <div id="fawry-payments">
      <iframe src=${url}  class="responsive-iframe" frameBorder="0">

      </iframe>
     </div>
     <div id="error"></div>
     </div>
    </div>`;
      document.getElementById("id01").style.display = "block";
      document.body.appendChild(div);
    } else if (config.mode === DISPLAY_MODE.SIDE_PAGE) {
      var div =
        document.getElementById(fawryplugin_frame_div_id) ||
        FawryPay.createDiv();
      div.innerHTML = `<div id="id02">
        <div class="container">
       <div id="fawry-payments">
        <iframe id='fawryPayPaymentFrame' src=${url} scrolling="yes" style="border: 0; height: 100vh !important; ${style}"/>

        <div id="error"></div>
       </div>
        </div>
       </div>`;
      document.getElementById("id02").style.display = "block";
      config.mode == DISPLAY_MODE.SIDE_PAGE && div.classList.add("side-page");
      document.body.appendChild(div);
    } else {
      var div =
        document.getElementById(fawryplugin_frame_div_id) ||
        FawryPay.createDiv();
      div.innerHTML = `<iframe id='fawryPayPaymentFrame' src=${url} scrolling="${
        config.mode == DISPLAY_MODE.SIDE_PAGE ? "yes" : "no"
      }" style="border: 0; ${style}"/>`;
      config.mode == DISPLAY_MODE.SIDE_PAGE && div.classList.add("side-page");
      document.body.appendChild(div);
    }
  }

  static getIframStyleBasedOnMode(mode) {
    switch (mode) {
      case DISPLAY_MODE.INSIDE_PAGE:
      case DISPLAY_MODE.SIDE_PAGE:
        return "width:100%; height:800px;";
    }
  }

  static createDiv() {
    const div = document.createElement("div");
    div.setAttribute("id", fawryplugin_frame_div_id);
    return div;
  }
}

const eventMethod = window.addEventListener
  ? "addEventListener"
  : "attachEvent"; // to support IE-8
const eventListener = window[eventMethod];
var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message"; // to support IE-8

eventListener(messageEvent, receiveMessage, false);

function receiveMessage(message) {
  if (message.origin === fawry_plugin_origin) {
    // message dispatched from the target origin
    document.getElementById(fawryplugin_frame_div_id)?.remove();
    const data = message.data;
    if (data) {
      data.status == 200 || data.statusCode == 200
        ? onSuccessCallBack(data)
        : onFailureCallBack(data);
    }
  }
}

function onSuccessCallBack(data) {
  if (FawryPay.config) {
    FawryPay.config.onSuccess
      ? FawryPay.config.onSuccess(data)
      : (window.location.href =
          FawryPay.config.returnUrl + mapToUrlParams(data));
  }
}

function onFailureCallBack(data) {
  if (FawryPay.config) {
    FawryPay.config.onFailure
      ? FawryPay.config.onFailure(data)
      : (window.location.href =
          FawryPay.config.returnUrl + mapToUrlParams(data));
  }
}

function mapToUrlParams(object) {
	return (FawryPay.config.returnUrl.includes('?') ? '&' : '?') +
		Object.keys(object)
			.filter(prop => prop != "customerMobile" && prop != "customerMail")
			.map(prop => [prop, object[prop]]
				.map(encodeURIComponent).join("="))
			.join("&");
}

function getAllUrlParams(url) {

  // get query string from url (optional) or window
  var queryString = url ? url.split('?')[1] : window.location.search.slice(1);

  // we'll store the parameters here
  var obj = {};

  // if query string exists
  if (queryString) {

    // stuff after # is not part of query string, so get rid of it
    queryString = queryString.split('#')[0];

    // split our query string into its component parts
    var arr = queryString.split('&');

    for (var i = 0; i < arr.length; i++) {
      // separate the keys and the values
      var a = arr[i].split('=');

      // set parameter name and value (use 'true' if empty)
      var paramName = a[0];
      var paramValue = typeof (a[1]) === 'undefined' ? true : a[1];

      // (optional) keep case consistent
      paramName = paramName;
      if (typeof paramValue === 'string') paramValue = paramValue;

      // if the paramName ends with square brackets, e.g. colors[] or colors[2]
      if (paramName.match(/\[(\d+)?\]$/)) {

        // create key if it doesn't exist
        var key = paramName.replace(/\[(\d+)?\]/, '');
        if (!obj[key]) obj[key] = [];

        // if it's an indexed array e.g. colors[2]
        if (paramName.match(/\[\d+\]$/)) {
          // get the index value and add the entry at the appropriate position
          var index = /\[(\d+)\]/.exec(paramName)[1];
          obj[key][index] = paramValue;
        } else {
          // otherwise add the value to the end of the array
          obj[key].push(paramValue);
        }
      } else {
        // we're dealing with a string
        if (!obj[paramName]) {
          // if it doesn't exist, create property
          obj[paramName] = paramValue;
        } else if (obj[paramName] && typeof obj[paramName] === 'string'){
          // if property does exist and it's a string, convert it to an array
          obj[paramName] = [obj[paramName]];
          obj[paramName].push(paramValue);
        } else {
          // otherwise add the property
          obj[paramName].push(paramValue);
        }
      }
    }
  }

  return obj;
}

function getAllUrlParams(url) {

  // get query string from url (optional) or window
  var queryString = url ? url.split('?')[1] : window.location.search.slice(1);

  // we'll store the parameters here
  var obj = {};

  // if query string exists
  if (queryString) {

    // stuff after # is not part of query string, so get rid of it
    queryString = queryString.split('#')[0];

    // split our query string into its component parts
    var arr = queryString.split('&');

    for (var i = 0; i < arr.length; i++) {
      // separate the keys and the values
      var a = arr[i].split('=');

      // set parameter name and value (use 'true' if empty)
      var paramName = a[0];
      var paramValue = typeof (a[1]) === 'undefined' ? true : a[1];

      // (optional) keep case consistent
      paramName = paramName;
      if (typeof paramValue === 'string') paramValue = paramValue;

      // if the paramName ends with square brackets, e.g. colors[] or colors[2]
      if (paramName.match(/\[(\d+)?\]$/)) {

        // create key if it doesn't exist
        var key = paramName.replace(/\[(\d+)?\]/, '');
        if (!obj[key]) obj[key] = [];

        // if it's an indexed array e.g. colors[2]
        if (paramName.match(/\[\d+\]$/)) {
          // get the index value and add the entry at the appropriate position
          var index = /\[(\d+)\]/.exec(paramName)[1];
          obj[key][index] = paramValue;
        } else {
          // otherwise add the value to the end of the array
          obj[key].push(paramValue);
        }
      } else {
        // we're dealing with a string
        if (!obj[paramName]) {
          // if it doesn't exist, create property
          obj[paramName] = paramValue;
        } else if (obj[paramName] && typeof obj[paramName] === 'string'){
          // if property does exist and it's a string, convert it to an array
          obj[paramName] = [obj[paramName]];
          obj[paramName].push(paramValue);
        } else {
          // otherwise add the property
          obj[paramName].push(paramValue);
        }
      }
    }
  }

  return obj;
}


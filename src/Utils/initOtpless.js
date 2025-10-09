/* eslint-disable no-async-promise-executor */
let OTPlessSignin = null;
export async function OTPlessSdk() {
  return new Promise(async (resolve) => {
    if (document.getElementById("otpless-sdk") && OTPlessSignin)
      return resolve();

    // Loading the script if it's not already loaded

    const script = document.createElement("script");
    script.src = "https://otpless.com/v4/headless.js";
    script.id = "otpless-sdk";

    // Get your app id from https://otpless.com/dashboard/customer/dev-settings

    script.setAttribute("data-appid", import.meta.env.VITE_OTPLESS_APP_ID);

    // Initializing the OTPless SDK when the script loads with the callback function

    script.onload = function () {
      const OTPless = Reflect.get(window, "OTPless");
      OTPlessSignin = new OTPless(callback);
      resolve();
      setTimeout(() => {
        const otplessParent = document.getElementById(
          "otpless-login-page-parent"
        );
        if (otplessParent) {
          otplessParent.style.zIndex = "1000000";
        }
      }, 500);
    };
    document.head.appendChild(script);
  });
}

export async function hitOTPlessSdk(params) {
  await OTPlessSdk();

  const { requestType, request } = params;

  return await OTPlessSignin[requestType](request);
}

//OTPLess Main Script to initiate the authentication

/**  Otpless callback function
 * @description
 * This function is called after authentication is done, by otpless-sdk.
 * Use this function to further process the otplessUser object, navigate to next page or perform any other action based on your requirement.
 * @param {Object} eventCallback
 * @returns {void}
 */
const callback = (eventCallback) => {
  console.log({ eventCallback });

  const ONETAP = () => {
    const { response } = eventCallback;
    console.log({ response, token: response.token });
    // Replace the following code with your own logic
    console.log(response);
    // alert(JSON.stringify(response));
  };

  const OTP_AUTO_READ = () => {
    const {
      response: { otp },
    } = eventCallback;

    // YOUR OTP FLOW

    const otpInput = document.getElementById("otp-input");
    otpInput.value = otp;
  };

  const FAILED = () => {
    const { response } = eventCallback;
    console.log({ response });
  };

  const FALLBACK_TRIGGERED = () => {
    const { response } = eventCallback;
  };

  const EVENTS_MAP = {
    ONETAP,
    OTP_AUTO_READ,
    FAILED,
    FALLBACK_TRIGGERED,
  };

  if ("responseType" in eventCallback) EVENTS_MAP[eventCallback.responseType]();
};
export async function initiate(phoneNumber) {
  const request = {
    channel: "PHONE",
    phone: phoneNumber,
    countryCode: "+91",
    expiry: "60", //Headless request can be customized with custom expiry.
  };
  const initiate = await hitOTPlessSdk({
    requestType: "initiate",
    request,
  });
  console.log({ initiate });
}

export async function oauth(channelType) {
  const initiate = await hitOTPlessSdk({
    requestType: "initiate",
    request: {
      channel: "OAUTH",
      channelType,
    },
  });
  console.log({ initiate });
  return initiate;
}

export async function verify(phone, otp) {
  const verify = await hitOTPlessSdk({
    requestType: "verify",
    request: {
      channel: "PHONE",
      phone: phone,
      otp: otp,
      countryCode: "+91",
    },
  });
  console.log({ verify });
  return verify;
}

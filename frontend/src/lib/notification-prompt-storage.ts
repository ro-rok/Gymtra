const DONT_ASK_AGAIN_KEY = "gymtra_notif_dont_ask_again";

export const getNotificationDontAskAgain = () =>
  typeof window !== "undefined" && localStorage.getItem(DONT_ASK_AGAIN_KEY) === "1";

export const setNotificationDontAskAgain = (value: boolean) => {
  if (typeof window === "undefined") return;
  if (value) {
    localStorage.setItem(DONT_ASK_AGAIN_KEY, "1");
  } else {
    localStorage.removeItem(DONT_ASK_AGAIN_KEY);
  }
};

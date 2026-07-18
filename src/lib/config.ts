// Public app configuration. Cloud sync/presence are OFF by default: firebase
// apiKey is empty, so src/lib/client/main.ts skips initCloud() and everything
// runs purely on localStorage. To enable cross-device sync later, create your
// own Firebase project and paste its web config below.

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  databaseURL?: string;
}

export const APP_CONFIG: {
  siteId: string;
  firebase: FirebaseConfig;
  feedbackFormUrl: string;
} = {
  siteId: "ml-exam-qa",
  firebase: {
    apiKey: "", // empty => cloud sync + live presence disabled
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  },
  feedbackFormUrl: "",
};

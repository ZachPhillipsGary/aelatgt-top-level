window.onload = () => {
  let socket;

  if (socket) {
    socket.on("connect", () => {
      init()
      console.log("connected to server");
    });
    socket.on("new_user", data => {
      console.log("new_user", data)
    });
    socket.on("UserDataError", error => alert(error))
  }
}

window.login = (email, token) => {
  if (email.length) {
    const {
      submitEmail
    } = window;
    if (!submitEmail || typeof submitEmail == "undefined") {
      alert(`Unable to login in ${email} automatically. Please login manually.`)
      return;
    }
    window.APP.store.update({
      credentials: {
        email
      }
    });
    submitEmail(email)
  }
}

window.initSSO = (googleElement) => gapi.load('auth2', () => {
  try {
    socket = io(window.SSOSocketURL);
  } catch (error) {
    console.error(error)
  }
  console.log("Auth2 context loaded")
  let googleClientId = document.querySelector('meta[name="google-signin-client_id"]').content
  if (googleElement) {
    googleClientId = googleElement.content
    console.log(`googleClientId: ${googleClientId}`)
  }
  const auth2 = gapi.auth2.init({
    client_id: googleClientId,
    scope: 'profile'
  });
  const {
    localStorage
  } = window;
  // load ___hubs_store
  let hubsData
  try {
    hubsData = JSON.parse(localStorage.getItem("___hubs_store"))
  } catch (error) {
    console.log(error)
    alert(error.message)
  }

  // Listen for sign-in state changes.
  auth2.isSignedIn.listen(value => {
    console.log(`Login: ${value}`)
  });

  // Listen for changes to current user.
  auth2.currentUser.listen(userChanged => {
    const profile = auth2.currentUser.get().getBasicProfile();
    console.log('ID: ' + profile.getId());
    const email = profile.getEmail()
    console.log('Email: ' + email);
    let token;
    if (!window.hasLoggedIn) {
      // ensure we only login once
      window.hasLoggedIn = true
      window.login(email, token)
      socket.emit("sso_login_event", {
        userChanged,
        email,
        hubsData
      });
    }
  });
  // Sign in the user if they are currently signed in.
  if (auth2.isSignedIn.get() == false) {
    auth2.signIn();
  }
});
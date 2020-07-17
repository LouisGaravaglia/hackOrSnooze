$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $navMyStories = $("#nav-my-stories");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navSubmit = $("#nav-submit");
  const $mainNavLinks = $(".main-nav-links");
  const $hackOrSnooze = $("#nav-all");
  const $navFavorites = $("#nav-favorites");
  const $favArticles = $("#favorited-articles");
  const $favStar = $(".fa-star");



  // global storyList variable
  let storyList = null;


  // global currentUser variable
  let currentUser = null;

  /**
   * Event listener for logging in.
   *  If successful we will setup the user instance
   */
  await checkIfLoggedIn();


  // ================================================================== CLICK EVENTS ================================================================== //

  /**
   * Log Out Functionality
   */
  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });




  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });



  $navSubmit.on("click", function () {
    hideElements();
    $submitForm.slideToggle();
  })


  $navFavorites.on("click", function () {
    hideElements();
    $favArticles.slideToggle();
    // showFavoriteStories()
    generateFaves();

  })

  //TODO:  ADD FAVORITE STORY
  $allStoriesList.on("click", ".fa-star", function (e) {
    const target = e.target;
    const favoriteStories = currentUser.favorites
    const targetId = target.parentElement.parentElement.id;
    const idMemory = [];
    
    if (target.classList.contains("fas")) {
      $(this).toggleClass("far fas");

      for (let i = 0; i < favoriteStories.length; i++) {
        if (favoriteStories[i].storyId == targetId) {
          idMemory.push(i);
        }
      }
      
      for (let i = idMemory.length - 1; i >= 0; i--) {
        favoriteStories.splice(idMemory[i],1);
      }

    } else {
      $(this).toggleClass("far fas");

      for (let story of storyList.stories) {
        if (story.storyId === targetId) {
          currentUser.favorites.push(story);
        }
      }
    }    
  })


  //FIXME: REMOVE FAVORITE STORY
  $favArticles.on("click", ".fa-star", function (e) {
    const target = e.target;
    const favoriteStories = currentUser.favorites
    const targetId = target.parentElement.parentElement.id;
    const idMemory = [];
    console.log(target.parentElement.parentElement);
    
      $(this).toggleClass("far fas");

      for (let i = 0; i < favoriteStories.length; i++) {
        if (favoriteStories[i].storyId == targetId) {
          idMemory.push(i);
        }
      }
      
      for (let i = idMemory.length - 1; i >= 0; i--) {
        favoriteStories.splice(idMemory[i],1);
      }

    
  })


  $hackOrSnooze.on("click", async function () {
    hideElements();
    await generateStories();
    $allStoriesList.show();

  })




  // ================================================================== SUBMIT EVENTS ================================================================== //

  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });


  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });


  /** 
   * 
   * Event listener for submiting a story.
   */
  $submitForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let author = $("#author").val();
    let title = $("#title").val();
    let url = $("#url").val();
    const newStory = {
      author,
      title,
      url
    }


    const res = await storyList.addStory(currentUser, newStory);

    currentUser.ownStories.push(res);
    await generateStories();
    $allStoriesList.slideToggle();
    $submitForm.slideToggle();

  });


  $navMyStories.on("click", function () {
    hideElements();
    generateUserStories();
    $ownStories.slideToggle();
  });


  // ================================================================== LOAD/DELETE USER STORIES ================================================================== //



  function generateUserStories() {
    $ownStories.empty();
    // loop through all of user submitted stories and generate HTML for them
    for (let story of currentUser.ownStories) {
      const result = generateUserStoryHTML(story);
      $ownStories.append(result);
    }
  }

  function generateUserStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
        <p class="trash-can"><i class="fas fa-trash text-danger"></i></p>
      </li>
    `);

    return storyMarkup;
  }



  $ownStories.on("click", async function (e) {

    storyId = e.target.parentElement.parentElement.id;

    await storyList.deleteStory(currentUser, storyId);
    generateUserStories()


  });



  // ================================================================== DOM FUNCTIONS ================================================================== //


  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  
  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();


    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);

    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);
    const userFavorites = currentUser.favoriteIds;
    let starType = isFavorite(story) ? "fas" : "far";



    const storyMarkup = $(`
      <li id="${story.storyId}">
      <p class="star"><i class="${starType} fa-star"></i></p>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    // const starIcon = storyMarkup[0].children[0];

    // for (const id of userFavorites) {
    //   if (id === story.storyId) starIcon.classList.add("add-favorite");
    // }



    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $favArticles
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $mainNavLinks.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }

  //FIXME:
    /* see if a specific story is in the user's list of favorites */

    function isFavorite(story) {
      let favStoryIds = new Set();
      if (currentUser) {
        favStoryIds = new Set(currentUser.favorites.map(obj => obj.storyId));
      }
      return favStoryIds.has(story.storyId);
    }

    //FIXME:
    function generateFaves() {
      // empty out the list by default
      $favArticles.empty();
  
      // if the user has no favorites
      if (currentUser.favorites.length === 0) {
        $favArticles.append("<h5>No favorites added!</h5>");
      } else {
        // for all of the user's favorites
        for (let story of currentUser.favorites) {
          // render each story in the list
          let favoriteHTML = generateStoryHTML(story);
          $favArticles.append(favoriteHTML);
        }
      }
    }

  // async function showFavoriteStories() {
  //   $favArticles.empty()
  //   // loop through all of our stories and generate HTML for them
  //   console.log("showFavoriteStories", currentUser.favorites);
  //   for (let story of currentUser.favorites) {
  //     const result = generateStoryHTML(story);
  //     $favArticles.append(result);

  //   }
  // }

});
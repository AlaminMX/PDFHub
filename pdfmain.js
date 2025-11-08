// // ----------------- Config -----------------
// const firebaseConfig = {
//   apiKey: "AIzaSyCDt_p3h8FjL7ElPMmwfhUknIAKHarC0oU",
//   authDomain: "cloudpdf-4b0ef.firebaseapp.com",
//   projectId: "cloudpdf-4b0ef",
//   storageBucket: "cloudpdf-4b0ef.appspot.com", // ✅ fixed
//   messagingSenderId: "141450451314",
//   appId: "1:141450451314:web:b0bf225dc256f28c82e5eb",
//   measurementId: "G-WB452ZBL8N"
// };

// // ----------------- Initialize Firebase -----------------
// firebase.initializeApp(firebaseConfig);

//   const auth = firebase.auth();
//   const db = firebase.firestore();
//   const storage = firebase.storage();
//   const fileInput = document.getElementById("file-input");
//   const progressBar = document.getElementById("uploadProgress");

//   fileInput.addEventListener("change", (event) => {
//     const file = event.target.files[0];
//     if (!file) return;

//     if (file.type !== "application/pdf") {
//       alert("Please select a PDF only.");
//       return;
//     }

//     progressBar.style.display = "block";
//     progressBar.value = 0;

//     const storageRef = storage.ref("pdfs/" + Date.now() + "-" + file.name);
//     const uploadTask = storageRef.put(file);

//     uploadTask.on(
//       "state_changed",
//       (snapshot) => {
//         const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
//         progressBar.value = progress;
//       },
//       (error) => {
//         console.error("Upload failed:", error);
//         alert("Upload error: " + error.message);
//         progressBar.style.display = "none";
//       },
//       () => {
//         uploadTask.snapshot.ref.getDownloadURL().then((url) => {
//           console.log("File available at:", url);
//           alert("Upload complete ✅\nDownload URL: " + url);
//           progressBar.style.display = "none";
//         });
//       }
//     );
//   });
  
  
//   // 1. Handle file selection
// fileInput.addEventListener("change", handleFileUpload);

// async function handleFileUpload(event) {
//   const files = event.target.files;
//   if (!files.length) return;

//   for (let file of files) {
//     await uploadFile(file);
//   }
// }

// // 2. Upload file to Firebase Storage
// async function uploadFile(file) {
//   // Create storage ref
//   const storageRef = firebase.storage().ref();
//   const fileRef = storageRef.child(`pdfs/${file.name}`);

//   // Start upload
//   const uploadTask = fileRef.put(file);

//   // Track progress
//   uploadTask.on(
//     "state_changed",
//     (snapshot) => {
//       const progress =
//         (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
//       console.log(`Upload is ${progress}% done`);
//       updateProgressBar(progress); // your progress bar function
//     },
//     (error) => {
//       console.error("Upload failed:", error);
//     },
//     async () => {
//       // Upload complete → get download URL
//       const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();

//       // Build file metadata
//       const fileMeta = {
//         id: generateUniqueId(),
//         name: file.name,
//         size: file.size,
//         url: downloadURL,
//         categoryId: "Uncategorized",
//         uploadedAt: new Date().toISOString(),
//       };

//       // Save metadata to Firestore
//       const currentUser = firebase.auth().currentUser;
//       if (currentUser) {
//         await saveFilesToFirebase(fileMeta, currentUser);
//       } else {
//         console.error("No user logged in!");
//       }
//     }
//   );
// }

// // 3. Save metadata to Firestore
// async function saveFilesToFirebase(fileMeta, currentUser) {
//   try {
//     await db.collection("users")
//       .doc(currentUser.uid)
//       .collection("files")
//       .doc(fileMeta.id)
//       .set(fileMeta);

//     console.log("✅ File metadata saved to Firebase!");
//   } catch (err) {
//     console.error("❌ Error saving file to Firebase:", err);
//     showError("Failed to save file.");
//   }
// }
// // ----------------- Firebase Services -----------------


// // Quick test: check if Firebase works
// console.log("Firebase initialized:", firebase.apps.length > 0);


// ----------------- Firebase Config -----------------
const firebaseConfig = {
  apiKey: "AIzaSyCDt_p3h8FjL7ElPMmwfhUknIAKHarC0oU",
  authDomain: "cloudpdf-4b0ef.firebaseapp.com",
  projectId: "cloudpdf-4b0ef",
  storageBucket: "cloudpdf-4b0ef.appspot.com",
  messagingSenderId: "141450451314",
  appId: "1:141450451314:web:b0bf225dc256f28c82e5eb",
  measurementId: "G-WB452ZBL8N"
};

// ----------------- Initialize Firebase -----------------
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

const fileInput = document.getElementById("file-input");
const progressBar = document.getElementById("uploadProgress");

// ----------------- Helper: Generate Unique IDs -----------------
function generateUniqueId() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

// ----------------- Upload Handler -----------------
fileInput.addEventListener("change", handleFileUpload);

// ----------------- PDFNest Authentication -----------------
async function initializeAuth() {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      console.log("User authenticated:", user.email);
      await initializeUserData(user);
      showMainApp();
    } else {
      console.log("No user authenticated");
      showAuthScreen();
    }
  });
}

async function initializeUserData(user) {
  try {
    // Create user document if it doesn't exist
    const userDoc = await db.collection("users").doc(user.uid).get();

    if (!userDoc.exists) {
      await db.collection("users").doc(user.uid).set({
        email: user.email,
        displayName: user.displayName || user.email,
        photoURL: user.photoURL || null,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        storageUsed: 0,
        fileCount: 0,
        migratedFromAnonymous: false
      });

      // Create default FREE subscription
      await db.collection("users")
        .doc(user.uid)
        .collection("subscription")
        .doc("current")
        .set({
          tier: 'FREE',
          billingCycle: 'MONTHLY',
          storageQuota: 524288000, // 500MB
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          cancelAtPeriodEnd: false
        });

      console.log("✅ User profile created for:", user.email);
    } else {
      // Update last login
      await db.collection("users").doc(user.uid).update({
        lastLoginAt: new Date()
      });
    }

    // Load user's files from Firebase
    await loadUserFiles(user.uid);
  } catch (err) {
    console.error("❌ Error initializing user data:", err);
  }
}

async function loadUserFiles(userId) {
  try {
    const filesSnapshot = await db.collection("users")
      .doc(userId)
      .collection("files")
      .get();

    const userFiles = [];
    filesSnapshot.forEach((doc) => {
      userFiles.push(doc.data());
    });

    console.log("✅ Loaded", userFiles.length, "files for user");

    // Update global files array for the UI
    if (typeof window.files !== 'undefined') {
      window.files = userFiles;
      // Trigger UI update if function exists
      if (typeof window.updateUI === 'function') {
        window.updateUI();
      }
    }
  } catch (err) {
    console.error("❌ Error loading user files:", err);
  }
}

async function signInWithEmail(email, password) {
  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    console.log("✅ Email sign-in successful:", result.user.email);
    return result.user;
  } catch (err) {
    console.error("❌ Email sign-in failed:", err);
    throw err;
  }
}

async function signUpWithEmail(email, password, displayName) {
  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);

    // Update display name
    await result.user.updateProfile({
      displayName: displayName
    });

    // Send email verification
    await result.user.sendEmailVerification();

    console.log("✅ Email signup successful:", result.user.email);
    console.log("📧 Verification email sent");

    return result.user;
  } catch (err) {
    console.error("❌ Email signup failed:", err);
    throw err;
  }
}

async function signInWithGoogle() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);
    console.log("✅ Google sign-in successful:", result.user.email);
    return result.user;
  } catch (err) {
    console.error("❌ Google sign-in failed:", err);
    throw err;
  }
}

async function resetPassword(email) {
  try {
    await auth.sendPasswordResetEmail(email);
    console.log("📧 Password reset email sent to:", email);
    return true;
  } catch (err) {
    console.error("❌ Password reset failed:", err);
    throw err;
  }
}

async function signOut() {
  try {
    await auth.signOut();
    console.log("✅ User signed out");
  } catch (err) {
    console.error("❌ Sign out failed:", err);
  }
}

function showAuthScreen() {
  const authScreen = document.getElementById('auth-screen');
  const mainContainer = document.getElementById('main-container');

  if (authScreen) authScreen.classList.remove('hidden');
  if (mainContainer) mainContainer.classList.add('hidden');
}

function showMainApp() {
  const authScreen = document.getElementById('auth-screen');
  const mainContainer = document.getElementById('main-container');

  if (authScreen) authScreen.classList.add('hidden');
  if (mainContainer) mainContainer.classList.remove('hidden');

  // Update user header information
  updateUserHeader();
}

function updateUserHeader() {
  const user = auth.currentUser;
  if (!user) return;

  const userName = document.getElementById('user-name');
  const userEmail = document.getElementById('user-email');
  const userAvatar = document.getElementById('user-avatar');

  if (userName) {
    userName.textContent = user.displayName || user.email.split('@')[0];
  }

  if (userEmail) {
    userEmail.textContent = user.email;
  }

  if (userAvatar && user.photoURL) {
    userAvatar.innerHTML = `<img src="${user.photoURL}" alt="User Avatar" class="avatar-img">`;
  }
}

async function handleFileUpload(event) {
  const files = event.target.files;
  if (!files.length) return;

  // Require authentication for uploads
  if (!auth.currentUser) {
    alert("Please sign in to upload files.");
    showAuthScreen();
    return;
  }

  for (let file of files) {
    if (file.type !== "application/pdf") {
      alert("Only PDF files are allowed!");
      continue;
    }
    await uploadFile(file, auth.currentUser);
  }
}

// ----------------- PDFNest Storage Management -----------------
async function updateStorageUsage(fileSizeDelta, userId) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    let currentStorage = 0;

    if (userDoc.exists) {
      currentStorage = userDoc.data().storageUsed || 0;
    }

    const newStorageUsed = Math.max(0, currentStorage + fileSizeDelta);

    await db.collection("users").doc(userId).set({
      storageUsed: newStorageUsed,
      updatedAt: new Date()
    }, { merge: true });

    console.log("✅ Storage usage updated:", newStorageUsed, "bytes");
    return newStorageUsed;
  } catch (err) {
    console.error("❌ Error updating storage usage:", err);
    throw err;
  }
}

async function checkUserSubscription(userId) {
  try {
    const subscriptionDoc = await db.collection("users")
      .doc(userId)
      .collection("subscription")
      .doc("current")
      .get();

    if (subscriptionDoc.exists) {
      const subscription = subscriptionDoc.data();
      const storageQuotas = {
        'FREE': 524288000,      // 500MB
        'PRO': 5368709120,      // 5GB
        'BUSINESS': 53687091200 // 50GB
      };

      return {
        tier: subscription.tier || 'FREE',
        storageQuota: storageQuotas[subscription.tier] || storageQuotas['FREE'],
        status: subscription.status || 'ACTIVE'
      };
    }

    // Default FREE tier
    return {
      tier: 'FREE',
      storageQuota: 524288000, // 500MB
      status: 'ACTIVE'
    };
  } catch (err) {
    console.error("❌ Error checking subscription:", err);
    // Default to FREE tier on error
    return {
      tier: 'FREE',
      storageQuota: 524288000,
      status: 'ACTIVE'
    };
  }
}

async function validateStorageQuota(fileSize, userId) {
  try {
    const subscription = await checkUserSubscription(userId);
    const userDoc = await db.collection("users").doc(userId).get();
    const currentUsage = userDoc.data()?.storageUsed || 0;

    const projectedUsage = currentUsage + fileSize;

    if (projectedUsage > subscription.storageQuota) {
      const currentUsageMB = (currentUsage / (1024 * 1024)).toFixed(1);
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(1);
      const quotaMB = (subscription.storageQuota / (1024 * 1024)).toFixed(1);

      throw new Error(
        `Storage quota exceeded!\n\nCurrent usage: ${currentUsageMB}MB\nNew file: ${fileSizeMB}MB\nQuota: ${quotaMB}MB\n\nPlease upgrade to ${subscription.tier === 'FREE' ? 'PRO' : 'BUSINESS'} tier for more storage.`
      );
    }

    return true;
  } catch (err) {
    console.error("❌ Storage quota validation failed:", err);
    throw err;
  }
}

// ----------------- Upload File to Firebase Storage -----------------
async function uploadFile(file, currentUser) {
  const userId = currentUser.uid || "guest";

  try {
    // Validate storage quota before upload
    await validateStorageQuota(file.size, userId);

    const fileId = generateUniqueId();
    const storageRef = storage.ref(`pdfs/${userId}/${fileId}-${file.name}`);

    progressBar.style.display = "block";
    progressBar.value = 0;

    const uploadTask = storageRef.put(file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        progressBar.value = progress;
      },
      (error) => {
        console.error("Upload failed:", error);
        alert("Upload failed: " + error.message);
        progressBar.style.display = "none";
      },
      async () => {
        // Upload completed → get download URL
        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();

        // Build metadata
        const fileMeta = {
          id: fileId,
          name: file.name,
          size: file.size,
          url: downloadURL,
          categoryId: "Uncategorized",
          uploadedAt: new Date().toISOString()
        };

        // Save metadata to Firestore
        try {
          await db.collection("users")
            .doc(userId)
            .collection("files")
            .doc(fileId)
            .set(fileMeta);

          // Update storage usage
          await updateStorageUsage(file.size, userId);

          console.log("✅ File metadata saved:", fileMeta);
        } catch (err) {
          console.error("❌ Error saving metadata:", err);
        } finally {
          progressBar.style.display = "none";
        }
      }
    );
  } catch (err) {
    console.error("❌ Upload validation failed:", err);
    alert(err.message);
    progressBar.style.display = "none";
  }
}

// Initialize PDFNest authentication system
initializeAuth();

// Make auth functions globally available for the UI
window.signInWithEmail = signInWithEmail;
window.signUpWithEmail = signUpWithEmail;
window.signInWithGoogle = signInWithGoogle;
window.resetPassword = resetPassword;
window.signOut = signOut;
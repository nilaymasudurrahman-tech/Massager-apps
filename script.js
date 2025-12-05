import { auth, db } from "./firebaseConfig.js";
import { 
    createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, deleteUser 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    ref, set, push, onValue, onChildAdded, onChildRemoved, onChildChanged, off, onDisconnect, update, remove, query, limitToLast, serverTimestamp, get, orderByChild, equalTo 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const getEl = (id) => document.getElementById(id);

// --- Variables ---
let myUid = "", myName = "", currentChat = null, currentChatId = null, currentChatRef = null;
let allEntities = [], currentFriendUid = null, typingTimeout = null, isRecording = false;
let mediaRecorder = null, audioChunks = [], lastMessageDate = null, selectedMsgId = null;
let peer = null, currentCall = null, localStream = null, isMuted = false, isCameraOff = false;
let currentWallpaper = "url('https://web.telegram.org/img/bg_0.png')";
let storyInterval = null, pendingFile = null;
let isBlocked = false;
let lastSenderId = null; 
let replyingTo = null;
let editingMsgId = null;
let recordingTimerInterval = null;
let currentAudio = null;
let isSignUp = false;

// --- DOM Elements ---
const authContainer = getEl("auth-container");
const appContainer = getEl("app-container");
const usersList = getEl("users-list");
const chatHeaderName = getEl("chat-header-name");
const chatStatus = getEl("chat-status");
const currentUserDisplay = getEl("current-user");
const currentUserBio = getEl("current-user-bio");
const chatMessagesDiv = getEl("chat-messages");
const msgInput = getEl("msg-input");
const sendBtn = getEl("send-btn");
const micBtn = getEl("mic-btn");
const attachBtn = getEl("attach-btn");
const fileInput = getEl("file-input");
const scrollBottomBtn = getEl("scroll-bottom-btn");
const headerAvatarImg = getEl("header-avatar-img");
const headerAvatarInitial = getEl("header-avatar-initial");
const myProfileImg = getEl("my-profile-img");
const myProfileInitial = getEl("my-profile-initial");
const notifySound = getEl("notify-sound");
const backBtn = getEl("back-btn");
const rightSidebar = getEl("right-sidebar");
const infoAvatarImg = getEl("info-avatar-img");
const infoAvatarInitial = getEl("info-avatar-initial");
const infoName = getEl("info-name");

// Settings Elements
const settingsBtn = getEl("settings-btn");
const settingsModal = getEl("settings-modal");
const closeSettings = getEl("close-settings");
const editNameInput = getEl("edit-name-input");
const editBioInput = getEl("edit-bio-input");
const saveProfileBtn = getEl("save-profile-btn");
const deleteAccountBtn = getEl("delete-account-btn");

// Group Elements
const createGroupBtn = getEl("create-group-btn");
const createGroupModal = getEl("create-group-modal");
const closeGroupModal = getEl("close-group-modal");
const groupNameInput = getEl("group-name-input");
const confirmGroupBtn = getEl("confirm-group-btn");
const addMemberBtn = getEl("add-member-btn");
const addMemberModal = getEl("add-member-modal");
const closeAddMember = getEl("close-add-member");
const addMemberList = getEl("add-member-list");
const groupMembersSection = getEl("group-members-section");
const groupMembersList = getEl("group-members-list");
const leaveGroupBtn = getEl("leave-group-btn");

// Friend Request Elements
const addFriendBtn = getEl("add-friend-btn");
const friendModal = getEl("friend-modal");
const closeFriendModal = getEl("close-friend-modal");
const friendSearchInput = getEl("friend-search-input");
const searchFriendBtn = getEl("search-friend-btn");
const friendSearchResult = getEl("friend-search-result");
const friendRequestsList = getEl("friend-requests-list");

// Saved Messages Button
const savedMsgBtn = getEl("saved-msg-btn");

// Story Elements
const addStoryBtn = getEl("add-story-btn");
const storyInput = getEl("story-input");
const storiesList = getEl("stories-list");
const storyViewerModal = getEl("story-viewer-modal");
const storyImage = getEl("story-image");
const storyProgressFill = getEl("story-progress-fill");
const closeStory = getEl("close-story");
const storyViewName = getEl("story-view-name");
const storyViewAvatar = getEl("story-view-avatar");
const storyTime = getEl("story-time");
const storyDeleteBtn = getEl("story-delete-btn");

// Chat Options Menu Elements (NEWLY ADDED VARIABLES)
const chatOptionsBtn = getEl("chat-options-btn");
const chatDropdown = getEl("chat-dropdown");
const optSearch = getEl("opt-search");
const optClear = getEl("opt-clear");
const optBlock = getEl("opt-block");
const chatSearchBox = getEl("chat-search-box");
const msgSearchInput = getEl("msg-search-input");
const closeSearch = getEl("close-search");

// Context Menu Elements
const contextMenu = getEl("context-menu");
const ctxReply = getEl("ctx-reply");
const ctxCopy = getEl("ctx-copy");
const ctxDelete = getEl("ctx-delete");
const ctxPin = getEl("ctx-pin");

// CALLING ELEMENTS (CRITICAL FOR THIS UPDATE)
const videoCallBtn = getEl("video-call-btn");
const audioCallBtn = getEl("audio-call-btn");
const callModal = getEl("call-modal");
const localVideo = getEl("local-video");
const remoteVideo = getEl("remote-video");
const endCallBtn = getEl("end-call-btn");
const muteBtn = getEl("mute-btn");
const cameraBtn = getEl("camera-btn");
const incomingCallModal = getEl("incoming-call-modal");
const acceptCallBtn = getEl("accept-call-btn");
const rejectCallBtn = getEl("reject-call-btn");
const callerNameEl = getEl("caller-name");

// --- Initialization ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        authContainer.style.display = "none";
        appContainer.style.display = "flex";
        myUid = user.uid;
        
        onValue(ref(db, 'users/' + myUid), (s) => {
            const data = s.val();
            if (data) {
                myName = data.username;
                currentUserDisplay.innerText = myName;
                currentUserBio.innerText = data.bio || "Available";
                
                if (data.avatar) {
                    myProfileImg.src = data.avatar;
                    myProfileImg.style.display = "block";
                    myProfileInitial.style.display = "none";
                } else {
                    myProfileImg.style.display = "none";
                    myProfileInitial.style.display = "flex";
                    myProfileInitial.innerText = myName.charAt(0).toUpperCase();
                }

                if(data.wallpaper) {
                    currentWallpaper = data.wallpaper;
                    updateWallpaper(data.wallpaper);
                }
            }
        });

        const connectedRef = ref(db, ".info/connected");
        const myStatusRef = ref(db, 'users/' + myUid);
        onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                update(myStatusRef, { status: "online" });
                onDisconnect(myStatusRef).update({ status: "offline", lastSeen: serverTimestamp() });
            }
        });

        if ("Notification" in window) Notification.requestPermission();

        initPeer(myUid);
        loadData(); 
        loadStories();
        listenForFriendRequests(); 
    } else {
        authContainer.style.display = "flex";
        appContainer.style.display = "none";
    }
});

// --- SAVED MESSAGES LOGIC ---
if(savedMsgBtn) {
    savedMsgBtn.addEventListener("click", () => {
        const savedEntity = {
            id: myUid, 
            type: 'saved',
            name: 'Saved Messages',
            avatar: 'https://cdn-icons-png.flaticon.com/512/10329/10329973.png' 
        };
        document.querySelectorAll(".user-item").forEach(el => el.classList.remove("active"));
        document.body.classList.add("chat-open");
        startChat(savedEntity);
    });
}

// --- Auth Logic ---
getEl("auth-btn").addEventListener("click", () => {
    const email = getEl("email").value, pass = getEl("password").value;
    const name = getEl("username").value;

    if (!email || !pass) return alert("Email & Password required");

    if (isSignUp) {
        if(!name) return alert("Name required");
        createUserWithEmailAndPassword(auth, email, pass).then((c) => {
            set(ref(db, 'users/' + c.user.uid), { 
                username: name, email: email, uid: c.user.uid, status: "online", bio: "Hey there!" 
            });
        }).catch(e => alert(e.message));
    } else {
        signInWithEmailAndPassword(auth, email, pass).catch(e => alert(e.message));
    }
});

getEl("toggle-auth").addEventListener("click", () => {
    isSignUp = !isSignUp;
    const formTitle = getEl("form-title");
    const authBtn = getEl("auth-btn");
    const toggleAuth = getEl("toggle-auth");
    const nameInput = getEl("username");

    if (isSignUp) {
        formTitle.innerText = "Create new account";
        authBtn.innerText = "Sign Up";
        toggleAuth.innerText = "Login";
        nameInput.style.display = "block";
    } else {
        formTitle.innerText = "Login";
        authBtn.innerText = "Login";
        toggleAuth.innerText = "Create Account";
        nameInput.style.display = "none";
    }
});

getEl("logout-btn").addEventListener("click", () => {
    update(ref(db, 'users/' + myUid), { status: "offline", lastSeen: serverTimestamp() });
    signOut(auth).then(() => location.reload());
});

// --- GROUP CREATION LOGIC ---
if(createGroupBtn) {
    createGroupBtn.addEventListener("click", () => {
        createGroupModal.style.display = "flex";
        groupNameInput.focus();
    });
}

if(closeGroupModal) {
    closeGroupModal.addEventListener("click", () => {
        createGroupModal.style.display = "none";
        groupNameInput.value = "";
    });
}

if(confirmGroupBtn) {
    confirmGroupBtn.addEventListener("click", () => {
        const groupName = groupNameInput.value.trim();
        if(!groupName) return alert("Please enter a group name");

        const newGroupRef = push(ref(db, 'groups'));
        set(newGroupRef, {
            name: groupName,
            createdBy: myUid,
            createdAt: serverTimestamp(),
            members: {
                [myUid]: true
            }
        }).then(() => {
            alert("Group created successfully!");
            createGroupModal.style.display = "none";
            groupNameInput.value = "";
        }).catch(err => alert("Error creating group: " + err.message));
    });
}

if(addMemberBtn) {
    addMemberBtn.addEventListener("click", () => {
        addMemberModal.style.display = "flex";
        loadAddableFriends();
    });
}

if(closeAddMember) {
    closeAddMember.addEventListener("click", () => {
        addMemberModal.style.display = "none";
    });
}

function loadAddableFriends() {
    addMemberList.innerHTML = "<div style='text-align:center; padding:10px;'>Loading friends...</div>";
    get(ref(db, 'friends/' + myUid)).then(friendsSnap => {
        addMemberList.innerHTML = "";
        if(!friendsSnap.exists()) {
            addMemberList.innerHTML = "<div style='text-align:center; padding:10px;'>No friends to add.</div>";
            return;
        }
        friendsSnap.forEach(friend => {
            const friendUid = friend.key;
            get(ref(db, `groups/${currentChat.id}/members/${friendUid}`)).then(memberSnap => {
                if(!memberSnap.exists()) {
                    get(ref(db, 'users/' + friendUid)).then(uSnap => {
                        const u = uSnap.val();
                        const div = document.createElement("div");
                        div.className = "user-item";
                        div.innerHTML = `<div class="avatar-wrapper"><div class="avatar-circle">${u.username.charAt(0).toUpperCase()}</div></div><div class="user-info"><div class="user-name">${u.username}</div></div><i class="fas fa-plus-circle" style="color:var(--primary-color); font-size:20px;"></i>`;
                        div.onclick = () => {
                            if(confirm(`Add ${u.username} to group?`)) {
                                update(ref(db, `groups/${currentChat.id}/members`), { [friendUid]: true }).then(() => { alert("Member added!"); div.remove(); });
                            }
                        };
                        addMemberList.appendChild(div);
                    });
                }
            });
        });
    });
}

function loadGroupDetailsInSidebar() {
    if(!currentChat || currentChat.type !== 'group') return;
    groupMembersSection.style.display = "block";
    groupMembersList.innerHTML = "Loading members...";
    const isAdmin = currentChat.createdBy === myUid;
    get(ref(db, `groups/${currentChat.id}/members`)).then(snap => {
        groupMembersList.innerHTML = "";
        snap.forEach(child => {
            const memberUid = child.key;
            get(ref(db, 'users/' + memberUid)).then(uSnap => {
                const u = uSnap.val();
                const div = document.createElement("div");
                div.className = "user-item";
                div.style.cursor = "default";
                div.style.padding = "5px 10px";
                let kickBtn = "";
                if(isAdmin && memberUid !== myUid) {
                    kickBtn = `<i class="fas fa-trash-alt" style="color:#ff4b4b; cursor:pointer; margin-left:auto;" title="Remove Member"></i>`;
                }
                let badge = "";
                if(memberUid === currentChat.createdBy) {
                    badge = `<span style="font-size:10px; background:var(--primary-color); color:white; padding:2px 5px; border-radius:4px; margin-left:5px;">Admin</span>`;
                }
                div.innerHTML = `<div style="display:flex; align-items:center; width:100%;"><div class="avatar-circle" style="width:30px; height:30px; font-size:14px; margin-right:10px;">${u.username.charAt(0).toUpperCase()}</div><div class="user-name" style="font-size:14px;">${u.username} ${badge}</div>${kickBtn}</div>`;
                if(kickBtn) { div.querySelector(".fa-trash-alt").onclick = () => kickMember(memberUid, u.username); }
                groupMembersList.appendChild(div);
            });
        });
    });
    if(isAdmin) {
        const infoNameEl = getEl("info-name");
        infoNameEl.title = "Click to edit group name";
        infoNameEl.style.cursor = "pointer";
        infoNameEl.onclick = () => {
            const newName = prompt("Enter new group name:", currentChat.name);
            if(newName && newName.trim() !== "") {
                update(ref(db, `groups/${currentChat.id}`), { name: newName }).then(() => {
                    infoNameEl.innerText = newName;
                    chatHeaderName.innerText = newName;
                    currentChat.name = newName;
                });
            }
        };
    } else {
        getEl("info-name").style.cursor = "default";
        getEl("info-name").onclick = null;
    }
}

function kickMember(uid, name) {
    if(confirm(`Remove ${name} from the group?`)) {
        remove(ref(db, `groups/${currentChat.id}/members/${uid}`)).then(() => { loadGroupDetailsInSidebar(); });
    }
}

if(leaveGroupBtn) {
    leaveGroupBtn.addEventListener("click", () => {
        if(confirm("Are you sure you want to leave this group?")) {
            remove(ref(db, `groups/${currentChat.id}/members/${myUid}`)).then(() => { location.reload(); });
        }
    });
}

// --- SETTINGS LOGIC ---
if(settingsBtn) { settingsBtn.addEventListener("click", () => { settingsModal.style.display = "flex"; editNameInput.value = myName; editBioInput.value = currentUserBio.innerText; }); }
if(closeSettings) { closeSettings.addEventListener("click", () => { settingsModal.style.display = "none"; }); }
if(saveProfileBtn) { saveProfileBtn.addEventListener("click", () => { const newName = editNameInput.value.trim(); const newBio = editBioInput.value.trim(); if(!newName) return alert("Display name cannot be empty"); update(ref(db, 'users/' + myUid), { username: newName, bio: newBio, wallpaper: currentWallpaper }).then(() => { alert("Settings saved!"); settingsModal.style.display = "none"; }); }); }
if(deleteAccountBtn) { deleteAccountBtn.addEventListener("click", () => { if(confirm("Are you sure?")) { const user = auth.currentUser; remove(ref(db, 'users/' + myUid)).then(() => { user.delete().then(() => location.reload()); }); } }); }
const wallItems = document.querySelectorAll(".wall-item");
wallItems.forEach(item => { item.addEventListener("click", () => { wallItems.forEach(i => i.classList.remove("selected")); item.classList.add("selected"); const bg = item.getAttribute("data-bg"); currentWallpaper = bg; updateWallpaper(bg); }); });

// --- Chat List ---
function loadData() {
    const friendsRef = ref(db, 'friends/' + myUid);
    const groupsRef = ref(db, 'groups');
    onValue(groupsRef, (gSnap) => {
        const groups = [];
        gSnap.forEach(child => { const g = child.val(); if(g.members && g.members[myUid]) { groups.push({ ...g, type: 'group', id: child.key }); } });
        onValue(friendsRef, (fSnap) => {
            const friendIds = []; fSnap.forEach(child => { friendIds.push(child.key); });
            if(friendIds.length === 0) { allEntities = [...groups]; renderList(allEntities); return; }
            const friendPromises = friendIds.map(fid => { return get(ref(db, 'users/' + fid)).then(snap => { if (snap.exists()) return { ...snap.val(), type: 'user', id: fid }; return null; }); });
            Promise.all(friendPromises).then(friends => { const validFriends = friends.filter(f => f !== null); allEntities = [...groups, ...validFriends]; renderList(allEntities); });
        });
    });
}

function renderList(list) {
    usersList.innerHTML = "";
    list.forEach(item => {
        const div = document.createElement("div"); div.classList.add("user-item"); div.id = `user-item-${item.id}`; div.style.order = "9999999999"; 
        let avatarHtml = "", statusDot = "";
        if(item.type === 'user') { if(item.status === "online") { div.classList.add("online"); statusDot = `<div class="status-dot"></div>`; } avatarHtml = item.avatar ? `<img src="${item.avatar}" class="avatar-img">` : `<div class="avatar-circle">${item.username.charAt(0).toUpperCase()}</div>`; } else { avatarHtml = `<div class="avatar-circle" style="background: #ff9800;"><i class="fas fa-users"></i></div>`; }
        div.innerHTML = `<div class="avatar-wrapper">${avatarHtml}${statusDot}</div><div class="user-info"><div class="user-name">${item.username || item.name}</div><div class="user-subtitle" id="sub-${item.id}">${item.type === 'group' ? 'Group Chat' : 'Tap to chat'}</div></div>`;
        let chatId = item.type === 'user' ? [myUid, item.id].sort().join("_") : item.id;
        const lastMsgQuery = query(ref(db, 'messages/' + chatId), limitToLast(1));
        onValue(lastMsgQuery, (snap) => { if(snap.exists()) { snap.forEach(child => { const m = child.val(); const subEl = document.getElementById(`sub-${item.id}`); const itemEl = document.getElementById(`user-item-${item.id}`); if(itemEl) itemEl.style.order = -m.timestamp; if(subEl) { let txt = m.type === 'text' ? m.text : 'Attachment'; if(m.senderId === myUid) txt = `You: ${txt}`; subEl.innerText = txt.length > 25 ? txt.substring(0,25)+"..." : txt; } }); } });
        div.addEventListener("click", () => { document.body.classList.add("chat-open"); document.querySelectorAll(".user-item").forEach(el => el.classList.remove("active")); div.classList.add("active"); startChat(item); });
        usersList.appendChild(div);
    });
}

// --- FRIEND REQUEST SYSTEM ---
if(addFriendBtn) { addFriendBtn.addEventListener("click", () => { friendModal.style.display = "flex"; friendSearchInput.focus(); }); }
if(closeFriendModal) { closeFriendModal.addEventListener("click", () => { friendModal.style.display = "none"; friendSearchResult.innerHTML = ""; friendSearchInput.value = ""; }); }
if(searchFriendBtn) { searchFriendBtn.addEventListener("click", () => { const queryText = friendSearchInput.value.trim(); if(!queryText) return alert("Please enter email or username"); friendSearchResult.innerHTML = '<div style="text-align:center; padding:10px; color:gray;">Searching...</div>'; const emailQuery = query(ref(db, 'users'), orderByChild('email'), equalTo(queryText)); const userQuery = query(ref(db, 'users'), orderByChild('username'), equalTo(queryText)); get(emailQuery).then(snap => { if(snap.exists()) { displaySearchResult(snap); } else { get(userQuery).then(snap2 => { if(snap2.exists()) { displaySearchResult(snap2); } else { friendSearchResult.innerHTML = "<div style='padding:10px; color:red; text-align:center;'>User not found.</div>"; } }); } }); }); }
function displaySearchResult(snapshot) { friendSearchResult.innerHTML = ""; snapshot.forEach(childSnapshot => { const u = childSnapshot.val(); u.uid = childSnapshot.key; if(u.uid === myUid) { friendSearchResult.innerHTML = "<div style='padding:10px; text-align:center; color:gray;'>You cannot add yourself.</div>"; return; } const div = document.createElement("div"); div.className = "friend-search-result-item"; div.innerHTML = `<div style="display:flex; align-items:center; gap:10px;"><div style="width:40px; height:40px; background:#3390ec; border-radius:50%; color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:18px;">${u.username.charAt(0).toUpperCase()}</div><div><div style="font-weight:bold; color:var(--text-color);">${u.username}</div><div style="font-size:12px; color:var(--text-secondary);">${u.email}</div></div></div><button class="add-friend-action" id="req-btn-${u.uid}">Send Request</button>`; friendSearchResult.appendChild(div); get(ref(db, `friends/${myUid}/${u.uid}`)).then(fSnap => { if(fSnap.exists()) { const btn = document.getElementById(`req-btn-${u.uid}`); if(btn) { btn.innerText = "Friend"; btn.style.backgroundColor = "#00c853"; btn.disabled = true; } } else { get(ref(db, `friendRequests/${u.uid}/${myUid}`)).then(rSnap => { if(rSnap.exists()) { const btn = document.getElementById(`req-btn-${u.uid}`); if(btn) { btn.innerText = "Sent"; btn.style.backgroundColor = "gray"; btn.disabled = true; } } }); } }); const btn = document.getElementById(`req-btn-${u.uid}`); btn.onclick = () => sendFriendRequest(u); }); }
function sendFriendRequest(targetUser) { const btn = document.getElementById(`req-btn-${targetUser.uid}`); if(btn) btn.innerText = "Sending..."; const reqData = { senderUid: myUid, senderName: myName, senderEmail: auth.currentUser.email, timestamp: Date.now(), status: "pending" }; set(ref(db, `friendRequests/${targetUser.uid}/${myUid}`), reqData).then(() => { if(btn) { btn.innerText = "Sent"; btn.style.backgroundColor = "gray"; btn.disabled = true; } alert("Request Sent Successfully!"); }).catch(err => { alert("Error: " + err.message); if(btn) btn.innerText = "Try Again"; }); }
function listenForFriendRequests() { const reqRef = ref(db, `friendRequests/${myUid}`); onValue(reqRef, (snap) => { friendRequestsList.innerHTML = ""; if(!snap.exists()) { friendRequestsList.innerHTML = '<div style="color: gray; text-align: center; font-size: 13px;">No pending requests</div>'; return; } snap.forEach(child => { const req = child.val(); const div = document.createElement("div"); div.className = "req-item"; div.innerHTML = `<div class="req-info"><span class="req-name">${req.senderName}</span><span class="req-email">${req.senderEmail}</span></div><div class="req-actions"><button class="req-btn req-accept" id="accept-${req.senderUid}">Accept</button><button class="req-btn req-reject" id="reject-${req.senderUid}">Reject</button></div>`; friendRequestsList.appendChild(div); document.getElementById(`accept-${req.senderUid}`).onclick = () => acceptRequest(req.senderUid); document.getElementById(`reject-${req.senderUid}`).onclick = () => rejectRequest(req.senderUid); }); }); }
function acceptRequest(senderUid) { update(ref(db, `friends/${myUid}`), { [senderUid]: true }); update(ref(db, `friends/${senderUid}`), { [myUid]: true }); remove(ref(db, `friendRequests/${myUid}/${senderUid}`)); alert("You are now friends!"); }
function rejectRequest(senderUid) { remove(ref(db, `friendRequests/${myUid}/${senderUid}`)); }

// --- STORY FEATURE ---
if(addStoryBtn) addStoryBtn.addEventListener("click", () => storyInput.click());
if(storyInput) { storyInput.addEventListener("change", (e) => { const file = e.target.files[0]; if(file) { const reader = new FileReader(); reader.onload = (ev) => { const storyRef = push(ref(db, 'stories')); const storyData = { image: ev.target.result, timestamp: Date.now(), uid: myUid, name: myName, storyId: storyRef.key }; set(storyRef, storyData).then(() => alert("Story Uploaded!")); }; reader.readAsDataURL(file); } }); }
function loadStories() { onValue(ref(db, 'stories'), (snap) => { storiesList.innerHTML = ""; snap.forEach(child => { const story = child.val(); if (Date.now() - story.timestamp > 86400000) return; const div = document.createElement("div"); div.classList.add("story-item"); const borderStyle = story.uid === myUid ? "border: 2px solid #00c853;" : ""; div.innerHTML = `<div class="story-circle" style="${borderStyle}"><img src="${story.image}"></div><span class="story-name">${story.uid === myUid ? "You" : story.name}</span>`; div.onclick = () => viewStory(story); if(story.uid === myUid) { storiesList.prepend(div); } else { storiesList.appendChild(div); } }); }); }
function viewStory(story) { storyViewerModal.style.display = "flex"; storyImage.src = story.image; storyViewName.innerText = story.name; storyTime.innerText = new Date(story.timestamp).toLocaleTimeString(); get(ref(db, `users/${story.uid}/avatar`)).then(s => { if(s.val()) storyViewAvatar.src = s.val(); else storyViewAvatar.src = "https://cdn-icons-png.flaticon.com/512/2111/2111646.png"; }); if(story.uid === myUid) { storyDeleteBtn.style.display = "block"; storyDeleteBtn.onclick = () => deleteStory(story.storyId); } else { storyDeleteBtn.style.display = "none"; } storyProgressFill.style.width = "0%"; let width = 0; if(storyInterval) clearInterval(storyInterval); storyInterval = setInterval(() => { width += 1; storyProgressFill.style.width = width + "%"; if(width >= 100) { clearInterval(storyInterval); storyViewerModal.style.display = "none"; } }, 50); }
function deleteStory(storyId) { if(confirm("Delete this story?")) { remove(ref(db, `stories/${storyId}`)).then(() => { clearInterval(storyInterval); storyViewerModal.style.display = "none"; }); } }
if(closeStory) { closeStory.addEventListener("click", () => { storyViewerModal.style.display = "none"; if(storyInterval) clearInterval(storyInterval); }); }

// --- Standard Chat Logic ---
function startChat(entity) {
    if (currentChatRef) off(currentChatRef);
    currentChat = entity;
    
    chatHeaderName.innerText = entity.name || entity.username; 
    
    if(entity.type === 'saved') {
        headerAvatarImg.src = entity.avatar;
        headerAvatarImg.style.display = "block";
        headerAvatarInitial.style.display = "none";
        
        chatStatus.innerText = "cloud storage";
        chatStatus.style.color = "var(--text-secondary)";
        
        // Hide Actions
        getEl("video-call-btn").style.display = "none"; 
        getEl("audio-call-btn").style.display = "none"; 
        getEl("add-member-btn").style.display = "none";
        getEl("chat-options-btn").style.display = "none"; // No block/delete options needed
        
        // Chat ID for Saved Messages: saved_UID
        currentChatId = `saved_${myUid}`;
        currentFriendUid = null;
    } 
    else if(entity.type === 'user') {
        if(entity.avatar) { headerAvatarImg.src = entity.avatar; headerAvatarImg.style.display = "block"; headerAvatarInitial.style.display = "none"; } else { headerAvatarImg.style.display = "none"; headerAvatarInitial.style.display = "flex"; headerAvatarInitial.innerText = entity.username.charAt(0).toUpperCase(); }
        
        // Block check
        onValue(ref(db, 'blocked/' + myUid + '/' + entity.id), (snap) => { 
            isBlocked = snap.val() === true; 
            updateBlockUI(); 
        });

        onValue(ref(db, 'users/' + entity.id), (snap) => { const u = snap.val(); if(!u) return; if(u.status === "online") { chatStatus.innerText = "online"; chatStatus.style.color = "#00c853"; } else { chatStatus.innerText = "last seen " + new Date(u.lastSeen || Date.now()).toLocaleTimeString(); chatStatus.style.color = "var(--text-secondary)"; } });
        getEl("video-call-btn").style.display = "block"; getEl("audio-call-btn").style.display = "block"; getEl("add-member-btn").style.display = "none";
        getEl("chat-options-btn").style.display = "block";
        
        currentChatId = entity.type === 'user' ? [myUid, entity.id].sort().join("_") : entity.id; currentFriendUid = entity.type === 'user' ? entity.id : null;
    } else {
        headerAvatarImg.style.display = "none"; headerAvatarInitial.style.display = "flex"; headerAvatarInitial.innerHTML = '<i class="fas fa-users"></i>'; headerAvatarInitial.style.background = "#ff9800"; chatStatus.innerText = "Group Chat"; getEl("video-call-btn").style.display = "none"; getEl("audio-call-btn").style.display = "none"; isBlocked = false; updateBlockUI();
        if(entity.createdBy === myUid) { getEl("add-member-btn").style.display = "block"; } else { getEl("add-member-btn").style.display = "none"; }
        getEl("chat-options-btn").style.display = "block";
        currentChatId = entity.id; currentFriendUid = null;
    }
    
    chatMessagesDiv.innerHTML = ""; msgInput.disabled = false; micBtn.disabled = false; msgInput.focus(); lastMessageDate = null; lastSenderId = null; cancelReply(); editingMsgId = null; 
    loadMessages(currentChatId);
    
    // Typing Listener
    onValue(ref(db, 'typing/' + currentChatId), (snap) => {
        if(!snap.exists()) { 
            if(entity.type === 'user' && chatStatus.innerText.includes("typing")) {
                chatStatus.innerText = "online"; 
                chatStatus.classList.remove("typing-dots");
            }
            return;
        }
        const data = snap.val();
        let isSomeoneTyping = false;
        Object.keys(data).forEach(uid => { if(uid !== myUid) isSomeoneTyping = true; });
        if(isSomeoneTyping) { chatStatus.innerText = "typing"; chatStatus.classList.add("typing-dots"); chatStatus.style.color = "#3390ec"; } else { chatStatus.classList.remove("typing-dots"); }
    });

    onValue(ref(db, `chats/${currentChatId}/pinnedMessage`), (snap) => { const pinned = snap.val(); const pinBar = getEl("pinned-message-bar"); if(pinned) { pinBar.style.display = "flex"; getEl("pinned-text").innerText = pinned.text; pinBar.onclick = () => scrollToMessage(pinned.id); } else { pinBar.style.display = "none"; } });
}

// --- CHAT OPTIONS LOGIC (NEW: SEARCH, CLEAR, BLOCK) ---

// 1. Search in Chat
if(optSearch) {
    optSearch.onclick = () => {
        chatDropdown.style.display = "none";
        chatSearchBox.style.display = "flex";
        msgSearchInput.focus();
    };
}

if(closeSearch) {
    closeSearch.onclick = () => {
        chatSearchBox.style.display = "none";
        msgSearchInput.value = "";
        // Reset view
        document.querySelectorAll(".message").forEach(el => el.style.display = "flex");
    };
}

if(msgSearchInput) {
    msgSearchInput.oninput = (e) => {
        const val = e.target.value.toLowerCase();
        document.querySelectorAll(".message").forEach(el => {
            const text = el.innerText.toLowerCase();
            if(text.includes(val)) el.style.display = "flex";
            else el.style.display = "none";
        });
    };
}

// 2. Clear Chat
if(optClear) {
    optClear.onclick = () => {
        chatDropdown.style.display = "none";
        if(confirm("Are you sure you want to clear this chat history?")) {
            remove(ref(db, `messages/${currentChatId}`));
            chatMessagesDiv.innerHTML = "";
        }
    };
}

// 3. Block User
if(optBlock) {
    optBlock.onclick = () => {
        chatDropdown.style.display = "none";
        if(currentChat.type !== 'user') return alert("You can only block users.");
        
        const newStatus = !isBlocked;
        if(newStatus) {
            set(ref(db, `blocked/${myUid}/${currentChat.id}`), true);
        } else {
            remove(ref(db, `blocked/${myUid}/${currentChat.id}`));
        }
    };
}

// Dropdown Toggle
if(chatOptionsBtn) {
    chatOptionsBtn.onclick = (e) => {
        e.stopPropagation();
        chatDropdown.style.display = chatDropdown.style.display === "block" ? "none" : "block";
    };
}

// Hide Dropdown on Click Outside
document.addEventListener("click", (e) => {
    if (chatDropdown && !chatDropdown.contains(e.target) && e.target !== chatOptionsBtn) {
        chatDropdown.style.display = "none";
    }
});

// Update Block UI Function
function updateBlockUI() {
    const notice = getEl("blocked-notice");
    const inputArea = getEl("input-wrapper");
    
    if(isBlocked) {
        optBlock.innerHTML = '<i class="fas fa-check"></i> Unblock User';
        notice.style.display = "block";
        inputArea.style.display = "none";
        getEl("unblock-link").onclick = () => {
            remove(ref(db, 'blocked/' + myUid + '/' + currentChat.id));
        };
    } else {
        optBlock.innerHTML = '<i class="fas fa-ban"></i> Block User';
        notice.style.display = "none";
        inputArea.style.display = "block";
    }
}

// --- UPDATE: MAKE HEADER CLICKABLE FOR INFO ---
const chatHeaderClickable = getEl("chat-header-clickable");
if(chatHeaderClickable) {
    chatHeaderClickable.addEventListener("click", (e) => {
        // Prevent firing if back button is clicked
        if(e.target.closest("#back-btn")) return;
        
        rightSidebar.classList.add("active");
        if(currentChat) {
            infoName.innerText = currentChat.username || currentChat.name;
            if(currentChat.avatar) infoAvatarImg.src = currentChat.avatar;
            if(currentChat.type === 'group') loadGroupDetailsInSidebar();
        }
    });
}

getEl("close-right-sidebar").addEventListener("click", () => rightSidebar.classList.remove("active"));

function loadMessages(chatId) {
    currentChatRef = ref(db, 'messages/' + chatId);
    onChildAdded(currentChatRef, (snapshot) => { 
        const msg = snapshot.val(); 
        displayMessage(msg, snapshot.key); 
        if(msg.senderId !== myUid && !msg.seen) update(ref(db, 'messages/' + chatId + '/' + snapshot.key), { seen: true }); 
        if(msg.senderId !== myUid) {
            notifySound.play().catch(()=>{});
            sendLocalNotification(msg.senderName, msg.type === 'text' ? msg.text : "Sent a file");
        }
    });
        
    onChildChanged(currentChatRef, (snapshot) => { 
        const msg = snapshot.val(); 
        const msgDiv = document.getElementById(snapshot.key);
        if(msgDiv) { 
            if(msg.type === 'text') {
                const contentSpan = msgDiv.querySelector("span:not(.msg-meta)");
                if(contentSpan) {
                    contentSpan.innerHTML = `<span style="white-space: pre-wrap;">${msg.text}</span> <span class="edited-label">(edited)</span>`;
                }
            }
            const tick = msgDiv.querySelector('.fa-check-double'); 
            if(tick && msg.seen) tick.classList.add('seen'); 
            renderReactions(msg.reactions, msgDiv); 
        } 
    });
    
    onChildRemoved(currentChatRef, (snapshot) => { 
        const div = document.getElementById(snapshot.key); 
        if (div) {
            div.style.transition = "opacity 0.3s";
            div.style.opacity = "0";
            setTimeout(() => div.remove(), 300);
        }
    });
}

function displayMessage(msg, key) {
    const msgDate = new Date(msg.timestamp); const dateString = msgDate.toLocaleDateString();
    if(lastMessageDate !== dateString) { const dateDiv = document.createElement("div"); dateDiv.classList.add("date-divider"); dateDiv.innerText = dateString === new Date().toLocaleDateString() ? "Today" : dateString; chatMessagesDiv.appendChild(dateDiv); lastMessageDate = dateString; lastSenderId = null; }
    const div = document.createElement("div"); const isMine = msg.senderId === myUid; div.classList.add("message", isMine ? "my-message" : "other-message"); div.id = key;
    
    div.addEventListener("dblclick", () => initiateReply(msg, key));

    if (lastSenderId === msg.senderId) { div.classList.add("same-sender"); } else { if (!isMine && currentChat && currentChat.type === 'group') { const nameDiv = document.createElement("div"); nameDiv.classList.add("msg-sender-name"); nameDiv.innerText = msg.senderName; div.appendChild(nameDiv); } }
    
    let contentHtml = "";
    if (msg.type === 'text') {
        contentHtml = `<span style="white-space: pre-wrap;">${msg.text}</span>`;
        if(msg.edited) contentHtml += ` <span class="edited-label">(edited)</span>`;
    }
    else if (msg.type === 'image') contentHtml = `<img src="${msg.content}" class="msg-image">`;
    else if (msg.type === 'sticker') { contentHtml = `<img src="${msg.content}" class="msg-sticker">`; div.style.background = "transparent"; div.style.boxShadow = "none"; }
    else if (msg.type === 'audio') { const uniqueId = `audio-${key}`; contentHtml = `<div class="custom-audio" id="${uniqueId}"><button class="audio-ctrl" onclick="window.playAudio('${msg.content}', '${uniqueId}')"><i class="fas fa-play"></i></button><div class="audio-track"><div class="audio-wave-bg"></div><div class="audio-progress"></div></div></div>`; }
    else contentHtml = `<a href="${msg.content}" download="${msg.fileName}" class="file-attachment"><i class="fas fa-file"></i> ${msg.fileName}</a>`;
    
    if (msg.reply) { const replyDiv = document.createElement("div"); replyDiv.classList.add("reply-content"); replyDiv.innerHTML = `<div class="reply-name">${msg.reply.senderName}</div><div class="reply-text">${msg.reply.text}</div>`; replyDiv.onclick = (e) => { e.stopPropagation(); scrollToMessage(msg.reply.id); }; div.appendChild(replyDiv); }
    
    const timeStr = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); let checkIcon = isMine ? `<i class="fas fa-check-double ${msg.seen ? "seen" : ""}" style="margin-left:3px;"></i>` : ""; const metaDiv = document.createElement("span"); metaDiv.className = "msg-meta"; metaDiv.innerHTML = `${timeStr} ${checkIcon}`;
    const contentSpan = document.createElement("span"); contentSpan.innerHTML = contentHtml; div.appendChild(contentSpan); div.appendChild(metaDiv); const reactionDiv = document.createElement("div"); reactionDiv.className = "msg-reactions"; div.appendChild(reactionDiv);
    
    div.addEventListener("contextmenu", (e) => { 
        e.preventDefault(); 
        selectedMsgId = key; 
        
        if(isMine) {
            ctxDelete.style.display = "block";
            if(msg.type === 'text') {
                let ctxEdit = document.getElementById('ctx-edit');
                if(!ctxEdit) {
                    ctxEdit = document.createElement('div');
                    ctxEdit.id = 'ctx-edit';
                    ctxEdit.className = 'context-item';
                    ctxEdit.innerHTML = '<i class="fas fa-pen"></i> Edit';
                    ctxEdit.onclick = () => initiateEdit(msg, key);
                    ctxReply.parentNode.insertBefore(ctxEdit, ctxReply.nextSibling);
                }
                ctxEdit.style.display = "block";
            } else {
                const editBtn = document.getElementById('ctx-edit');
                if(editBtn) editBtn.style.display = "none";
            }
        } else {
            ctxDelete.style.display = "none";
            const editBtn = document.getElementById('ctx-edit');
            if(editBtn) editBtn.style.display = "none";
        }
        
        const menu = getEl("context-menu"); 
        menu.style.top = `${e.pageY}px`; 
        menu.style.left = `${e.pageX}px`; 
        menu.style.display = "block"; 
    });
    
    renderReactions(msg.reactions, div); chatMessagesDiv.appendChild(div); const isNearBottom = chatMessagesDiv.scrollHeight - chatMessagesDiv.scrollTop - chatMessagesDiv.clientHeight < 300; if(isMine || isNearBottom) scrollToBottom(); lastSenderId = msg.senderId;
}

function initiateEdit(msg, key) {
    editingMsgId = key;
    msgInput.value = msg.text;
    msgInput.focus();
    sendBtn.innerHTML = '<i class="fas fa-check"></i>'; 
    getEl("context-menu").style.display = "none";
    document.querySelectorAll('.message').forEach(m => m.classList.remove('editing-active'));
    const msgEl = document.getElementById(key);
    if(msgEl) msgEl.classList.add('editing-active');
}

function cancelEdit() {
    editingMsgId = null;
    msgInput.value = "";
    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
    document.querySelectorAll('.message').forEach(m => m.classList.remove('editing-active'));
}

getEl("ctx-delete").addEventListener("click", () => {
    if(selectedMsgId && confirm("Delete this message for everyone?")) {
        remove(ref(db, `messages/${currentChatId}/${selectedMsgId}`));
        getEl("context-menu").style.display = "none";
    }
});

function sendMessage() {
    const t = msgInput.value.trim();
    if (!t || !currentChatId) return;
    
    if(editingMsgId) {
        update(ref(db, `messages/${currentChatId}/${editingMsgId}`), {
            text: t,
            edited: true
        }).then(() => {
            cancelEdit();
        });
        return;
    }

    const msgData = { senderId: myUid, senderName: myName, text: t, type: 'text', timestamp: Date.now(), seen: false };
    if(replyingTo) { msgData.reply = replyingTo; cancelReply(); }
    
    push(ref(db, 'messages/' + currentChatId), msgData);
    msgInput.value = "";
    sendBtn.style.display = "none"; micBtn.style.display = "block";
    remove(ref(db, 'typing/' + currentChatId + '/' + myUid));
}

msgInput.addEventListener("input", () => {
    if (!currentChatId) return;
    update(ref(db, 'typing/' + currentChatId + '/' + myUid), true);
    if (msgInput.value.trim() !== "") { sendBtn.style.display = "block"; micBtn.style.display = "none"; } 
    else { sendBtn.style.display = "none"; micBtn.style.display = "block"; }
    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        remove(ref(db, 'typing/' + currentChatId + '/' + myUid));
    }, 2000);
});

function requestNotificationPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
        Notification.requestPermission();
    }
}
function sendLocalNotification(sender, text) {
    if (document.hidden && Notification.permission === "granted") {
        const notif = new Notification(`New message from ${sender}`, {
            body: text,
            icon: 'https://cdn-icons-png.flaticon.com/512/2111/2111646.png',
            vibrate: [200, 100, 200]
        });
        notif.onclick = function() { window.focus(); notif.close(); };
    }
}

window.playAudio = (src, id) => { if(currentAudio && !currentAudio.paused) { currentAudio.pause(); const oldId = currentAudio.customId; const oldEl = document.getElementById(oldId); if(oldEl) { oldEl.querySelector(".audio-ctrl").innerHTML = '<i class="fas fa-play"></i>'; oldEl.querySelector(".audio-progress").style.width = "0%"; } } const audio = new Audio(src); audio.customId = id; currentAudio = audio; const container = document.getElementById(id); const btn = container.querySelector(".audio-ctrl"); const progress = container.querySelector(".audio-progress"); btn.innerHTML = '<i class="fas fa-pause"></i>'; audio.play(); audio.addEventListener("timeupdate", () => { const percent = (audio.currentTime / audio.duration) * 100; progress.style.width = percent + "%"; }); audio.addEventListener("ended", () => { btn.innerHTML = '<i class="fas fa-play"></i>'; progress.style.width = "0%"; currentAudio = null; }); };
function createRecordingUI() { const wrapper = document.querySelector(".chat-input-area"); if(!document.querySelector(".recording-ui")) { const ui = document.createElement("div"); ui.className = "recording-ui"; ui.innerHTML = `<div class="rec-dot"></div><span class="rec-timer">00:00</span><span class="rec-cancel">Cancel</span>`; wrapper.insertBefore(ui, micBtn); ui.querySelector(".rec-cancel").onclick = cancelRecording; } } createRecordingUI();
function updateRecordingUI(show) { const ui = document.querySelector(".recording-ui"); const input = getEl("msg-input"); const others = [getEl("emoji-btn"), getEl("sticker-btn"), getEl("attach-btn")]; if(show) { ui.style.display = "flex"; input.style.display = "none"; others.forEach(el => el.style.display = "none"); micBtn.innerHTML = '<i class="fas fa-paper-plane"></i>'; } else { ui.style.display = "none"; input.style.display = "block"; others.forEach(el => el.style.display = "block"); micBtn.innerHTML = '<i class="fas fa-microphone"></i>'; } }
function startRecordingTimer() { let sec = 0; const timerEl = document.querySelector(".rec-timer"); recordingTimerInterval = setInterval(() => { sec++; const m = Math.floor(sec / 60).toString().padStart(2, '0'); const s = (sec % 60).toString().padStart(2, '0'); timerEl.innerText = `${m}:${s}`; }, 1000); }
function cancelRecording() { if (mediaRecorder) mediaRecorder.stop(); isRecording = false; clearInterval(recordingTimerInterval); audioChunks = []; updateRecordingUI(false); micBtn.classList.remove("recording"); document.querySelector(".rec-timer").innerText = "00:00"; }
micBtn.addEventListener("click", () => { if (!isRecording) { navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => { mediaRecorder = new MediaRecorder(stream); audioChunks = []; mediaRecorder.start(); isRecording = true; updateRecordingUI(true); startRecordingTimer(); micBtn.classList.add("recording"); mediaRecorder.addEventListener("dataavailable", e => audioChunks.push(e.data)); mediaRecorder.addEventListener("stop", () => { if(audioChunks.length > 0) { const blob = new Blob(audioChunks, { type: 'audio/mp3' }); const reader = new FileReader(); reader.readAsDataURL(blob); reader.onloadend = () => { push(ref(db, 'messages/' + currentChatId), { senderId: myUid, senderName: myName, content: reader.result, type: 'audio', timestamp: Date.now(), seen: false }); }; } stream.getTracks().forEach(t => t.stop()); }); }).catch(e => alert("Mic Error: " + e)); } else { if (mediaRecorder) mediaRecorder.stop(); isRecording = false; clearInterval(recordingTimerInterval); updateRecordingUI(false); micBtn.classList.remove("recording"); document.querySelector(".rec-timer").innerText = "00:00"; } });
document.addEventListener("click", (e) => { if(e.target.classList.contains("msg-image")) openImageViewer(e.target.src); });
function openImageViewer(src) { const viewer = getEl("image-viewer-modal"); viewer.innerHTML = `<div class="viewer-toolbar"><button class="viewer-btn" id="viewer-close"><i class="fas fa-times"></i></button><a href="${src}" download="image.png" class="viewer-btn" id="viewer-download"><i class="fas fa-download"></i></a></div><img src="${src}" class="viewer-image">`; viewer.style.display = "flex"; getEl("viewer-close").onclick = () => { viewer.style.display = "none"; }; }
function initiateReply(msg, msgId) { replyingTo = { id: msgId, text: msg.type === 'text' ? msg.text : `[${msg.type.toUpperCase()}]`, senderName: msg.senderName }; const preview = getEl("reply-preview"); const textPreview = getEl("reply-text-preview"); const namePreview = document.querySelector(".reply-title"); if(!namePreview) { const title = document.createElement("div"); title.className = "reply-title"; preview.querySelector(".reply-info").prepend(title); } preview.querySelector(".reply-title").innerText = replyingTo.senderName; textPreview.innerText = replyingTo.text; preview.style.display = "flex"; msgInput.focus(); }
function cancelReply() { replyingTo = null; getEl("reply-preview").style.display = "none"; } getEl("close-reply").addEventListener("click", cancelReply);
getEl("ctx-reply").addEventListener("click", () => { if(selectedMsgId) { const msgEl = document.getElementById(selectedMsgId); let text = msgEl.innerText.split("\n")[0]; const senderName = msgEl.classList.contains("my-message") ? "You" : (currentChat.type==='group' ? msgEl.querySelector('.msg-sender-name')?.innerText || currentChat.name : currentChat.username); initiateReply({ text: text, type: 'text', senderName: senderName }, selectedMsgId); getEl("context-menu").style.display = "none"; } });
function scrollToMessage(id) { const el = document.getElementById(id); if(el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add("highlight"); setTimeout(() => el.classList.remove("highlight"), 1500); } }
chatMessagesDiv.addEventListener("scroll", () => { if(chatMessagesDiv.scrollHeight - chatMessagesDiv.scrollTop - chatMessagesDiv.clientHeight > 300) scrollBottomBtn.style.display = "flex"; else scrollBottomBtn.style.display = "none"; }); scrollBottomBtn.addEventListener("click", scrollToBottom); function scrollToBottom() { chatMessagesDiv.scrollTo({ top: chatMessagesDiv.scrollHeight, behavior: 'smooth' }); }
sendBtn.addEventListener("click", sendMessage); msgInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); }); 
attachBtn.addEventListener("click", () => { if(currentChatId) fileInput.click(); });
fileInput.addEventListener("change", (e) => { const file = e.target.files[0]; if (file) { pendingFile = file; const reader = new FileReader(); reader.onload = (ev) => { getEl("file-preview-modal").style.display = "flex"; const container = getEl("preview-container"); container.innerHTML = ""; if(file.type.startsWith("image")) { const img = document.createElement("img"); img.src = ev.target.result; img.style.maxWidth = "100%"; img.style.borderRadius = "8px"; container.appendChild(img); } else { container.innerHTML = `<div style="padding:20px;"><i class="fas fa-file" style="font-size:50px; color:var(--primary-color);"></i><p style="margin-top:10px;">${file.name}</p></div>`; } }; reader.readAsDataURL(file); } });
getEl("confirm-send-file").addEventListener("click", () => { if (pendingFile && currentChatId) { const reader = new FileReader(); reader.onload = (ev) => { let type = 'file'; if (pendingFile.type.startsWith('image/')) type = 'image'; if (pendingFile.type.startsWith('audio/')) type = 'audio'; push(ref(db, 'messages/' + currentChatId), { senderId: myUid, senderName: myName, content: ev.target.result, type: type, fileName: pendingFile.name, timestamp: Date.now(), seen: false }); getEl("file-preview-modal").style.display = "none"; fileInput.value = ""; pendingFile = null; }; reader.readAsDataURL(pendingFile); } });
getEl("close-preview").addEventListener("click", () => { getEl("file-preview-modal").style.display = "none"; fileInput.value = ""; pendingFile = null; });
function renderReactions(reactions, msgDiv) { const container = msgDiv.querySelector(".msg-reactions"); if(!reactions) { container.style.display = "none"; return; } container.style.display = "flex"; const counts = {}; Object.values(reactions).forEach(r => counts[r] = (counts[r] || 0) + 1); container.innerHTML = Object.keys(counts).map(r => `<div class="reaction-pill">${r} ${counts[r]}</div>`).join(""); }
function updateWallpaper(bg) { const area = document.querySelector(".chat-area"); if(bg.startsWith("url")) { area.style.backgroundImage = bg; area.style.backgroundColor = "transparent"; } else { area.style.backgroundImage = "none"; area.style.backgroundColor = bg; } }
backBtn.addEventListener("click", () => { document.body.classList.remove("chat-open"); if(currentChatRef) off(currentChatRef); currentChatId = null; });
getEl("theme-toggle").addEventListener("click", () => { const isDark = document.body.getAttribute("data-theme") === "dark"; if(isDark) { document.body.removeAttribute("data-theme"); localStorage.setItem("theme", "light"); } else { document.body.setAttribute("data-theme", "dark"); localStorage.setItem("theme", "dark"); } });
if(localStorage.getItem("theme") === "dark") document.body.setAttribute("data-theme", "dark");
function initPeer(uid) { if (typeof Peer === "undefined" || peer) return; peer = new Peer(uid); peer.on('call', (call) => { getEl("ringtone-sound").play().catch(()=>{}); getEl("incoming-call-modal").style.display = "flex"; getEl("caller-name").innerText = "Incoming Call..."; getEl("accept-call-btn").onclick = () => { getEl("ringtone-sound").pause(); getEl("incoming-call-modal").style.display = "none"; navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => { setupCallUI(stream, true); call.answer(stream); currentCall = call; call.on('stream', (rs) => { getEl("remote-video").srcObject = rs; }); }); }; getEl("reject-call-btn").onclick = () => { getEl("ringtone-sound").pause(); getEl("incoming-call-modal").style.display = "none"; call.close(); }; }); }
function setupCallUI(stream, isVideo) { localStream = stream; getEl("local-video").srcObject = stream; getEl("call-modal").style.display = "flex"; if(!isVideo) { getEl("video-grid").style.display = "none"; getEl("audio-call-ui").style.display = "block"; } }
getEl("video-call-btn").addEventListener("click", () => startCall(true)); getEl("audio-call-btn").addEventListener("click", () => startCall(false));
function startCall(isVideo) { if (!currentFriendUid) return; navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true }).then((stream) => { setupCallUI(stream, isVideo); const call = peer.call(currentFriendUid, stream); currentCall = call; call.on('stream', (rs) => { getEl("remote-video").srcObject = rs; }); }).catch(e => alert("Error: " + e)); }
getEl("end-call-btn").addEventListener("click", () => { if (currentCall) currentCall.close(); if (localStream) localStream.getTracks().forEach(t => t.stop()); getEl("call-modal").style.display = "none"; });
getEl("toggle-info-btn").addEventListener("click", () => { rightSidebar.classList.add("active"); if(currentChat) { infoName.innerText = currentChat.username || currentChat.name; if(currentChat.avatar) infoAvatarImg.src = currentChat.avatar; if(currentChat.type === 'group') loadGroupDetailsInSidebar(); } });
getEl("close-right-sidebar").addEventListener("click", () => rightSidebar.classList.remove("active"));

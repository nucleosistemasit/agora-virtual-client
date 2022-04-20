if (typeof URLSearchParams !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.has('clientToken')) {
        localStorage.setItem('clientToken', params.get('clientToken'));
        window.location.search = "";
    }
}

var buildUrl = "Build";
var loaderUrl = buildUrl + "/ExpoGLBuildBrotli.loader.js";
var config = {
    dataUrl: "https://agoravirtual-bucket.s3.us-west-2.amazonaws.com/ExpoWebGLBuildBrotli.data.br",
    frameworkUrl:  buildUrl + "/ExpoWebGLBuild.framework.js",
    codeUrl: "https://agoravirtual-bucket.s3.us-west-2.amazonaws.com/ExpoWebGLBuildBrotli.wasm.br",
    streamingAssetsUrl: "StreamingAssets",
    companyName: "Núcleo",
    productName: "Metaverso Caxias",
    productVersion: "0.1",
};

var container = document.querySelector("#unity-container");
var canvas = document.querySelector("#unity-canvas");
var loadingBar = document.querySelector("#unity-loading-bar");
var progressBarFull = document.querySelector("#unity-progress-bar-full");
var fullscreenButton = document.querySelector("#unity-fullscreen-button");
var mobileWarning = document.querySelector("#unity-mobile-warning");

// By default Unity keeps WebGL canvas render target size matched with
// the DOM size of the canvas element (scaled by window.devicePixelRatio)
// Set this to false if you want to decouple this synchronization from
// happening inside the engine, and you would instead like to size up
// the canvas DOM size and WebGL render target sizes yourself.
// config.matchWebGLToCanvasSize = false;

if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    container.className = "unity-mobile";
    // Avoid draining fillrate performance on mobile devices,
    // and default/override low DPI mode on mobile browsers.
    config.devicePixelRatio = 1;
    mobileWarning.style.display = "block";
    setTimeout(() => {
        mobileWarning.style.display = "none";
    }, 5000);
} else {
    // canvas.style.width = "960px";
    // canvas.style.height = "600px";
}
loadingBar.style.display = "block";

function toggleKeyCapture() {
    if (document.pointerLockElement === canvas ||
        document.mozPointerLockElement === canvas) {
        gameInstance.SendMessage('FirstPersonPlayer', 'SetKeyboard', 1);
    } else {
        gameInstance.SendMessage('FirstPersonPlayer', 'SetKeyboard', 0);
    }
}

var gameInstance = null;
var script = document.createElement("script");
script.src = loaderUrl;
script.onload = () => {
    createUnityInstance(canvas, config, (progress) => {
        progressBarFull.style.width = 100 * progress + "%";
    }).then((unityInstance) => {
        gameInstance = unityInstance;
        loadingBar.style.display = "none";
    //           fullscreenButton.onclick = () => {
    //             unityInstance.SetFullscreen(1);
    //           };
        if ("onpointerlockchange" in document) {
            document.addEventListener('pointerlockchange', toggleKeyCapture, false);
        } else if ("onmozpointerlockchange" in document) {
            document.addEventListener('mozpointerlockchange', toggleKeyCapture, false);
        }

    }).catch((message) => {
        alert(message);
    });
};
document.body.appendChild(script);

var chatSocket = null;
var current_page = 1;

var entityMap = {
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
     "'": '&#39;',
     '`': '&#x60;'
};
function escapeHtml(string) {
    return String(string).replace(/[<>"'`]/g, function(s) {
        return entityMap[s];
    });
}

function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * 
            charactersLength));
    }
    return result;
}

function sendReply(element) {
    let reply_preview = document.getElementById("replyPreview");
    let reply_chat = document.getElementById("replyChat");
    let reply_s_chat = document.getElementById("sReplyChat");

    let id = element.closest('.msg-container').dataset.id;
    let content = element.closest('.p-messaged-chat').querySelector('.msg-content').textContent;
    let name = element.closest('.p-messaged-chat').querySelector('.s-messaged-chat').textContent;

    reply_preview.classList.remove("reply-off");
    reply_chat.innerHTML = content;
    reply_s_chat.innerHTML = name;
    reply_preview.dataset.id = id;
}

function closeReply() {
    document.getElementById("replyPreview").dataset.id = "";
    document.getElementById("replyPreview").classList.add("reply-off");
}

function loadNextPage(event) {
    let chatContainer = document.getElementById("chat");
    if (event.target.scrollTop == 0) {
        chatContainer.removeEventListener("scroll", loadNextPage);
        chatSocket.send(JSON.stringify({"command": "next_page", page_number: current_page}));
    }
}

function setInfiniteScroll() {
    let chatContainer = document.getElementById("chat");
    chatContainer.removeEventListener("scroll", loadNextPage);
    chatContainer.addEventListener("scroll", loadNextPage);
}

function toggleReaction(element) {
    let reaction_type = element.dataset.reaction;
    let id = element.closest('.msg-container').dataset.id;
    if (element.classList.contains('sent')) {
        chatSocket.send(JSON.stringify({"command": "react_remove", "message": id, "reaction_type": parseInt(reaction_type)}));
    }
    else {
        chatSocket.send(JSON.stringify({"command": "react_add", "message": id, "reaction_type": parseInt(reaction_type)}));
    }
}

function showRoomList() {
    if (document.getElementById('local-peer-name').value != "" && document.getElementById('local-peer-email').value != "" &&
        document.getElementById('local-peer-company').value != "") {
        document.getElementById("roomList").style.display = "block";
        document.getElementById("connect-peer").disabled = true;
        document.getElementById('local-peer-name').disabled = true;
        document.getElementById('local-peer-email').disabled = true;
        document.getElementById('local-peer-company').disabled = true;
    }
}

document.getElementById("connect-peer").addEventListener("click", showRoomList);

function connectRoom(element) {
    if (document.getElementById('local-peer-name').value != "" && document.getElementById('local-peer-email').value != "" &&
        document.getElementById('local-peer-company').value != "") {
        current_page = 1;
        document.getElementById('chat').innerHTML = "";
        let id = element.dataset.id;
        chatSocket.send(JSON.stringify({"command": "connect", "room": id, "username": document.getElementById('local-peer-name').value,
        "email": document.getElementById('local-peer-email').value, "company_name": document.getElementById('local-peer-company').value}));
        for (let i of document.querySelectorAll(".inner-icons-div")) {
            i.classList.remove("chat-selected");
        }
        element.classList.add("chat-selected");        
    }    
}

let clientToken = localStorage.getItem('clientToken');
if (clientToken == null) {
    let newToken = makeid(1000);
    localStorage.setItem('clientToken', newToken);
    clientToken = newToken;
}

chatSocket = new ReconnectingWebSocket('wss://metaversochat.youbot.us/ws/chat/exhibition/?clientToken=' + clientToken);

chatSocket.onopen = function(e) {
    document.getElementById("chat").removeEventListener("scroll", loadNextPage);
    current_page = 1;
    document.getElementById('roomList').innerHTML = "";
    document.getElementById('chat').innerHTML = "";
    chatSocket.send(JSON.stringify({"command": "list_rooms"}));
};

function printMessage (data, messageBlock, scrollToBottom) {
    if (data.content != null && data.content.trim() !== '') {
        let peerNode = document.createElement('div');
        let messageReply = '';
        if (data.reply_to != null) {
            messageReply = '<span class="reply-chat">' +
                                    '<strong class="s-reply-preview">' + 
                                        data.reply_to.username +
                                    '</strong>' +
                                    data.reply_to.content +
                                '</span>';
        }
        peerNode.dataset.id = data.id;
        if (data.is_admin) {
            peerNode.classList.add('mod-msg')
        }
        peerNode.classList.add('msg-container');
        let messageMenu = '<span id="messageMenu" class="msg-menu">' +
                                '<span id="replyMenu-' + data.id + '" class="menu-reply" onclick="sendReply(this)">⬅</span>' +      
                                '<span id="reactionMenu-' + data.id + '" class="menu-reactions">' +
                                '<span class="reaction-menu" data-reaction="1" onclick="toggleReaction(this)">👍</span>' +
                                '<span class="reaction-menu" data-reaction="2" onclick="toggleReaction(this)">👏</span>' +
                                '<span class="reaction-menu" data-reaction="3" onclick="toggleReaction(this)">❤</span>' +
                                '<span class="reaction-menu" data-reaction="4" onclick="toggleReaction(this)">🙌</span>' +
                                '<span class="reaction-menu" data-reaction="5" onclick="toggleReaction(this)">😮</span>' +
                                '<span class="reaction-menu" data-reaction="6" onclick="toggleReaction(this)">🤣</span>' +
                                '</span>' +
                            '</span>';
        let reactionNode = '';
        let reaction_types = ['1', '2', '3', '4', '5', '6'];
        let reaction_emojis = ['👍', '👏', '❤', '🙌', '😮', '🤣'];

        for (let reaction_type of reaction_types) {
            let reaction_visible = "";
            let reaction_sent = "";
            let reaction_quantity = 0;
            if (data["reaction_" + reaction_type] != null) {
                reaction_quantity = data["reaction_" + reaction_type];
                reaction_visible = data["reaction_" + reaction_type] > 0 ? "visible" : "";
            }
            if (data.sent_reactions != null) {
                reaction_sent = data.sent_reactions.includes(parseInt(reaction_type)) ? "sent" : "";
            }
            reactionNode += '<span class="reaction ' + reaction_sent + ' ' + reaction_visible + '" data-reaction="' + reaction_type + '" onclick="toggleReaction(this)">' + reaction_emojis[parseInt(reaction_type) - 1] + '<span class="react-quantity">' + reaction_quantity + '</span></span>';
        }

        peerNode.innerHTML = '<p class="p-messaged-chat"><strong class="s-messaged-chat">' + 
                                escapeHtml(data.username) + 
                                '</strong> ' + 
                                messageReply +
                                '<span class="msg-content">' + linkifyHtml(escapeHtml(data.content), {target: '_blank'}) + '</span>' +
                                '<span class="msg-reactions">' +
                                reactionNode +                                        
                                '</span>' +
                                '<span class="msg-timestamp">' +
                                data.created_at +
                                '</span>' +
                                messageMenu +
                                '</p>' +
                              '</span>';
        messageBlock.appendChild(peerNode);
        if (scrollToBottom) {
            if (data.from_me) {
                document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
            }
        }
        else {
            let messageBlockHeight = messageBlock.clientHeight;
            document.getElementById('chat').scrollTop = messageBlockHeight;
        }
    }
}

function printRoom(data) {
    let roomNode = document.createElement('div');
    roomNode.classList.add('inner-icons-div');
    roomNode.dataset.id = data.id;
    roomNode.dataset.name = data.display_name;
    roomNode.setAttribute('onclick', 'connectRoom(this)');
    roomNode.innerHTML = '<span id="roomPicture" class="inbox-icon room-picture align-middle"></span>';
    document.getElementById('roomList').appendChild(roomNode);
    document.getElementById("roomPicture").style.backgroundImage = "url(" + data.operator_picture + ")";
}

chatSocket.onmessage = function(e) {
    const data = JSON.parse(e.data);
    console.log('data', data);
    // Palestrante recebe pacote
    if (data.type == 'chat_list_rooms') {
        for (let room of data.rooms) {
            printRoom(room);
        }
    }
    else if (data.type == 'chat_notification') {
        if (document.querySelector('.inner-icons-div[data-id="' + data.id + '"]') != null) {
            // Notification
        }
    }
    else if (data.type == 'chat_message') {
        let messageBlock = document.getElementById('chat');
        printMessage(data, messageBlock, true);
    }
    else if (data.type == 'chat_history'){
        let messageBlock = document.createElement('div');
        messageBlock.classList.add("message-block");
        document.getElementById('chat').prepend(messageBlock);
        for (message of data.messages) {
            printMessage(message, messageBlock, false);
        }
        current_page++;
        if (data.has_next_page) {
            setInfiniteScroll();
        }
    }
    else if (data.type == 'chat_reaction') {
        let messageElement = document.querySelector('.msg-container[data-id="' + data.message + '"]');
        if (messageElement != null) {
            let reactionElement = messageElement.querySelector('.reaction[data-reaction="' + data.reaction_type + '"]');
            let reactionQuantity = reactionElement.querySelector('.react-quantity');
            reactionQuantity.textContent = data.quantity;
            if (data.name == 'react_add') {
                reactionElement.style.display = 'inline-block';
                if (data.from_me) {
                    reactionElement.classList.add('sent');
                }
            }
            else if (data.name == 'react_remove') {
                if (data.quantity == 0) {
                    reactionElement.style.display = 'none';
                }
                else {
                    if (data.from_me) {
                        reactionElement.classList.remove('sent');
                    }
                }
            }
        }
    }
    else if (data.type == 'chat_control') {
    }
    else if (data.type == 'chat_start') {
        if (data.username != null) {
            document.getElementById("local-peer-name").value = data.username;
        }
        if (data.email != null) {
            document.getElementById("local-peer-email").value = data.email;
        }
        if (data.company_name != null) {
            document.getElementById("local-peer-company").value = data.company_name;
        }
        if (data.profile_picture != null) {
            document.getElementById("host-picture").style.backgroundImage = "url(" + data.profile_picture + ")";
        }
        showRoomList();
    }
    else if (data.type == 'chat_connection') {
        // connectionCount++;
        // document.getElementById('conexoes').innerHTML = connectionCount;
        // let peerNode = document.createElement('p');
        // peerNode.className = "p-entered-chat";
        // peerNode.innerHTML = '<strong class="s-entered-chat">' + escapeHtml(data.username) + '</strong> entrou na sala.';
        // document.getElementById('chat').appendChild(peerNode);
        // document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
    }
    else if (data.type == 'chat_disconnection') {
        // connectionCount--;
        // document.getElementById('conexoes').innerHTML = connectionCount;
        // let peerNode = document.createElement('p');
        // peerNode.className = "p-exited-chat";
        // peerNode.innerHTML = '<strong class="s-exited-chat">' + escapeHtml(data.username) + '</strong> saiu da sala.';
        // document.getElementById('chat').appendChild(peerNode);
        // document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
    }
};

chatSocket.onclose = function(e) {
    console.log('host disconnected');
};

const sendButton = document.getElementById("send-message");

sendButton.addEventListener("click", function() {
    // Send message
    let messageTextarea = document.getElementById('message-content');
    let messageContent = messageTextarea.value;

    if (messageContent != null && messageContent.trim() !== '') {
        let messageData = {"command": "chat", "content": messageContent};
        if (document.getElementById("replyPreview").dataset.id != "") {
            messageData.reply_to = document.getElementById("replyPreview").dataset.id;
        }
        chatSocket.send(JSON.stringify(messageData));

        // Clear textarea
        messageTextarea.value = '';
        closeReply();
    }            
});

document.getElementById('message-content').addEventListener('keyup', function(e) {
    if (e.keyCode == 13) {
    sendButton.click();
}});

const pictureInput = document.getElementById("picture-input");
const deletePicture = document.getElementById("delete-picture");

pictureInput.addEventListener("change", function(event) {
    if (event.target.files && event.target.files[0]) {
        const formData = new FormData();
        formData.append('profile_picture', event.target.files[0]);
        const url = 'https://metaversochat.youbot.us/api/client-picture/' + localStorage.getItem('clientToken') + '/';
        const options = {
            method: "POST",
            body: formData
        };
        fetch(url, options)
            .then( res => res.json() )
            .then( response_json => {
                document.getElementById("host-picture").style.backgroundImage = "url(" + response_json.profile_picture + ")";
                event.target.value = "";
            });
    }
});

deletePicture.addEventListener("click", function() {
    const url = 'https://metaversochat.youbot.us/api/client-picture/' + localStorage.getItem('clientToken') + '/';
    const options = {
        method: "DELETE",
    };
    fetch(url, options)
        .then( res => {
            document.getElementById("host-picture").style.backgroundImage = "";
        });
});

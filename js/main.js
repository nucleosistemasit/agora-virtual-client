if (typeof URLSearchParams !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.has('clientToken')) {
        localStorage.setItem('clientToken', params.get('clientToken'));
        window.location.search = "";
    }
}

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

function connectRoom(element) {
    if (document.getElementById('local-peer-name').value != "") {
        current_page = 1;
        document.getElementById('chat').innerHTML = "";
        let id = element.dataset.id;
        chatSocket.send(JSON.stringify({"command": "connect", "room": id, "username": document.getElementById('local-peer-name').value}));
    }
}

let clientToken = localStorage.getItem('clientToken');
if (clientToken == null) {
    let newToken = makeid(1000);
    localStorage.setItem('clientToken', newToken);
    clientToken = newToken;
}

chatSocket = new ReconnectingWebSocket('ws://127.0.0.1:8000/ws/chat/exhibition/?clientToken=' + clientToken);

chatSocket.onopen = function(e) {
    document.getElementById("chat").removeEventListener("scroll", loadNextPage);
    current_page = 1;
    document.getElementById('room-list').innerHTML = "";
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
    roomNode.setAttribute('onclick', 'connectRoom(this)');
    roomNode.innerHTML = '<div class="inner-icons-div">' +
                            '<img style="width: 75px; height: 75px;" class="inbox-icon" src="' + (data.operator_picture || "") + '">' +
                        '</div>';

    document.getElementById('room-list').appendChild(roomNode);
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
            document.getElementById("host-name").textContent = data.username;
        }
        if (data.profile_picture != null) {
            document.getElementById("host-picture").style.backgroundImage = "url(" + data.profile_picture + ")";
        }
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
        const url = 'http://127.0.0.1:8000/api/client-picture/' + localStorage.getItem('clientToken') + '/';
        const options = {
            method: "POST",
            body: formData
        };
        fetch(url, options)
            .then( res => res.json() )
            .then( response_json => {
                document.getElementById("host-picture").src = response_json.profile_picture;
                event.target.value = "";
            });
    }
});

deletePicture.addEventListener("click", function() {
    const url = 'http://127.0.0.1:8000/api/client-picture/' + localStorage.getItem('clientToken') + '/';
    const options = {
        method: "DELETE",
    };
    fetch(url, options)
        .then( res => {
            document.getElementById("host-picture").src = "";
        });
});
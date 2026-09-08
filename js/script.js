/* =========================
   DOM
========================= */

const chatApp = document.querySelector(".chat-app");
const chatList = document.getElementById("chatList");
const messages = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const backBtn = document.getElementById("backBtn");
const searchInput = document.getElementById("searchInput");
const fileBtn = document.getElementById("fileBtn");
const fileInput = document.getElementById("fileInput");
const emojiBtn = document.getElementById("emojiBtn");
const newChatBtn = document.getElementById("newChatBtn");
const headerName = document.getElementById("headerName");
const headerAvatar = document.getElementById("headerAvatar");
const headerStatus = document.getElementById("headerStatus");

/* =========================
   匿名ユーザーID
========================= */

let guestId = localStorage.getItem("guestId");

if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem("guestId", guestId);
}

console.log("匿名ユーザーID:", guestId);

/* =========================
   guest_id からアイコン色を決定
   同じ guest_id は常に同じ色になります
========================= */

const avatarColors = [
    "avatar-blue",
    "avatar-green",
    "avatar-purple",
    "avatar-orange",
    "avatar-pink",
    "avatar-cyan"
];

function getAvatarColor(guestId) {

    if (!guestId) {
        return "avatar-gray";
    }

    let hash = 0;

    for (let i = 0; i < guestId.length; i++) {
        hash =
            guestId.charCodeAt(i) +
            ((hash << 5) - hash);
    }

    const index =
        Math.abs(hash) % avatarColors.length;

    return avatarColors[index];
}

/* =========================
   チャット
   ※匿名版では公開チャット1つを使用
========================= */

const PUBLIC_CHAT_ID =
    "00000000-0000-0000-0000-000000000001";

const chats = [
    {
        id: PUBLIC_CHAT_ID,
        name: "公開チャット",
        avatar: "G",
        color: "avatar-blue",
        status: "みんなでチャット",
        lastMessage: "誰でも参加できます",
        time: ""
    }
];

let currentChatId = PUBLIC_CHAT_ID;

/* =========================
   チャットリスト生成
========================= */

function renderChatList() {

    chatList.innerHTML = "";

    chats.forEach((chat, index) => {

        const item = document.createElement("button");

        item.className =
            "chat-item" +
            (chat.id === currentChatId ? " active" : "");

        item.dataset.chatId = chat.id;

        item.innerHTML = `
            <div class="avatar ${chat.color}">
                ${escapeHTML(chat.avatar)}
            </div>

            <div class="chat-info">
                <div class="chat-name">
                    ${escapeHTML(chat.name)}
                    <span class="online"></span>
                </div>

                <div class="last-message">
                    ${escapeHTML(chat.lastMessage)}
                </div>
            </div>

            <div class="chat-meta">
                <span class="chat-time">
                    ${escapeHTML(chat.time)}
                </span>
            </div>
        `;

        item.addEventListener("click", () => {
            selectChat(chat.id);
        });

        chatList.appendChild(item);
    });
}

/* =========================
   チャット選択
========================= */

async function selectChat(chatId) {

    const chat =
        chats.find(item => item.id === chatId);

    if (!chat) return;

    currentChatId = chatId;

    document
        .querySelectorAll(".chat-item")
        .forEach(item => {
            item.classList.toggle(
                "active",
                item.dataset.chatId === chatId
            );
        });

    headerName.textContent = chat.name;

    headerAvatar.textContent = chat.avatar;

    headerAvatar.className =
        "avatar " + chat.color;

    headerStatus.textContent = chat.status;

    chatApp.classList.add("chat-open");

    await loadMessages();

    messageInput.focus();
}

/* =========================
   メッセージ読み込み
========================= */

async function loadMessages() {

    const { data, error } = await supabaseClient
        .from("messages")
        .select("*")
        .eq("chat_id", currentChatId)
        .is("deleted_at", null)
        .order("created_at", {
            ascending: true
        });

    if (error) {
        console.error(
            "メッセージ取得エラー:",
            error
        );
        return;
    }

    messages.innerHTML = `
        <div class="date-divider">
            <span>今日</span>
        </div>
    `;

    data.forEach(message => {
        renderMessage(message);
    });

    updateChatPreview(data[data.length - 1]);

    scrollMessages();
}

/* =========================
   メッセージ表示
========================= */

function renderMessage(message) {

    if (!message || message.chat_id !== currentChatId) {
        return;
    }

    const messageRow =
        document.createElement("div");

    const isMine =
        message.guest_id === guestId;

    messageRow.className =
        isMine
            ? "message-row sent"
            : "message-row received";

    const date =
        new Date(message.created_at);

    const hours =
        String(date.getHours())
            .padStart(2, "0");

    const minutes =
        String(date.getMinutes())
            .padStart(2, "0");

    const time =
        `${hours}:${minutes}`;

    if (isMine) {

        messageRow.innerHTML = `
            <div class="message-content">
                <div class="message-bubble">
                    ${escapeHTML(message.content || "")}
                </div>

                <span class="message-time">
                    ${time}
                </span>
            </div>
        `;

    } else {

        messageRow.innerHTML = `
            <div class="message-avatar ${getAvatarColor(message.guest_id)}">G</div>

            <div class="message-content">
                <div class="message-bubble">
                    ${escapeHTML(message.content || "")}
                </div>

                <span class="message-time">
                    ${time}
                </span>
            </div>
        `;

    }

    messages.appendChild(messageRow);
}

/* =========================
   メッセージ送信
========================= */

async function sendMessage() {

    const text =
        messageInput.value.trim();

    if (text === "") return;

    sendBtn.disabled = true;

    const { data, error } =
        await supabaseClient
            .from("messages")
            .insert({
                chat_id: currentChatId,
                sender_id: null,
                guest_id: guestId,
                content: text,
                message_type: "text"
            })
            .select()
            .single();

    if (error) {

        console.error(
            "メッセージ保存エラー:",
            error
        );

        alert(
            "メッセージを送信できませんでした。"
        );

        sendBtn.disabled = false;
        return;
    }

    console.log(
        "メッセージ保存成功:",
        data
    );

    messageInput.value = "";

    updateChatPreview(data);

    sendBtn.disabled = false;
    messageInput.focus();
}

/* =========================
   チャットリストの最新メッセージ更新
========================= */

function updateChatPreview(message) {

    if (!message) return;

    const chat =
        chats.find(item =>
            item.id === message.chat_id
        );

    if (!chat) return;

    chat.lastMessage =
        message.content || "";

    const date =
        new Date(message.created_at);

    chat.time =
        `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

    renderChatList();
}

/* =========================
   Realtime
========================= */

function subscribeToMessages() {

    supabaseClient
        .channel("public-chat-messages")
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "messages",
                filter:
                    `chat_id=eq.${PUBLIC_CHAT_ID}`
            },
            payload => {

                console.log(
                    "新しいメッセージ:",
                    payload.new
                );

                if (
                    payload.new.chat_id !==
                    currentChatId
                ) {
                    return;
                }

                renderMessage(
                    payload.new
                );

                updateChatPreview(
                    payload.new
                );

                scrollMessages();
            }
        )
        .subscribe(status => {

            console.log(
                "Realtime:",
                status
            );

        });
}

/* =========================
   スクロール
========================= */

function scrollMessages() {

    messages.scrollTop =
        messages.scrollHeight;
}

/* =========================
   Enter送信
========================= */

messageInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();
        }
    }
);

sendBtn.addEventListener(
    "click",
    sendMessage
);

/* =========================
   HTMLエスケープ
========================= */

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}

/* =========================
   検索
========================= */

searchInput.addEventListener(
    "input",
    () => {

        const keyword =
            searchInput.value
                .toLowerCase()
                .trim();

        document
            .querySelectorAll(".chat-item")
            .forEach(item => {

                const name =
                    item
                        .querySelector(".chat-name")
                        .textContent
                        .toLowerCase();

                item.style.display =
                    name.includes(keyword)
                        ? "flex"
                        : "none";
            });
    }
);

/* =========================
   戻る
========================= */

backBtn.addEventListener(
    "click",
    () => {

        chatApp.classList.remove(
            "chat-open"
        );
    }
);

/* =========================
   新規チャット
========================= */

newChatBtn.addEventListener(
    "click",
    () => {

        alert(
            "現在は匿名の公開チャットのみ利用できます。\nユーザー検索・1対1チャットはログイン機能追加後に実装します。"
        );
    }
);

/* =========================
   ファイル
========================= */

fileBtn.addEventListener(
    "click",
    () => {
        fileInput.click();
    }
);

fileInput.addEventListener(
    "change",
    () => {

        const file =
            fileInput.files[0];

        if (!file) return;

        messageInput.value =
            `📎 ${file.name}`;

        messageInput.focus();
    }
);

/* =========================
   絵文字
========================= */

emojiBtn.addEventListener(
    "click",
    () => {

        messageInput.value += " 😊";

        messageInput.focus();
    }
);

/* =========================
   初期化
========================= */

renderChatList();
loadMessages();
subscribeToMessages();

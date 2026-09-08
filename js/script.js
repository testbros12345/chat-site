/* =========================
   DOM
========================= */

const chatApp = document.querySelector(".chat-app");

const chatItems = document.querySelectorAll(".chat-item");

const messages = document.getElementById("messages");

const messageInput = document.getElementById("messageInput");

const sendBtn = document.getElementById("sendBtn");

const backBtn = document.getElementById("backBtn");

const searchInput = document.getElementById("searchInput");

const fileBtn = document.getElementById("fileBtn");

const fileInput = document.getElementById("fileInput");

const emojiBtn = document.getElementById("emojiBtn");

const headerName = document.getElementById("headerName");

const headerAvatar = document.getElementById("headerAvatar");

const headerStatus = document.getElementById("headerStatus");

/* =========================
   匿名ユーザーID
========================= */

let guestId = localStorage.getItem("guestId");

if (!guestId) {
    guestId = crypto.randomUUID();

    localStorage.setItem(
        "guestId",
        guestId
    );
}

console.log("匿名ユーザーID:", guestId);

/* =========================
   チャットデータ
========================= */

const chats = [
    {
        name: "山田 太郎",
        avatar: "Y",
        color: "avatar-blue",
        status: "オンライン"
    },

    {
        name: "佐藤 花子",
        avatar: "S",
        color: "avatar-green",
        status: "オンライン"
    },

    {
        name: "鈴木 一郎",
        avatar: "T",
        color: "avatar-purple",
        status: "オフライン"
    }
];


/* =========================
   チャット選択
========================= */

chatItems.forEach(item => {

    item.addEventListener("click", () => {

        const chatIndex = Number(
            item.dataset.chat
        );

        selectChat(chatIndex);

    });

});


function selectChat(index) {

    const chat = chats[index];

    /* active変更 */

    chatItems.forEach(item => {
        item.classList.remove("active");
    });

    chatItems[index].classList.add("active");


    /* ヘッダー変更 */

    headerName.textContent = chat.name;

    headerAvatar.textContent = chat.avatar;

    headerAvatar.className =
        "avatar " + chat.color;

    headerStatus.textContent = chat.status;


    /* スマホ */

    chatApp.classList.add("chat-open");


    /* 入力欄 */

    messageInput.focus();

}


/* =========================
   メッセージ送信
========================= */

/* =========================
   メッセージ送信
========================= */

const PUBLIC_CHAT_ID =
    "00000000-0000-0000-0000-000000000001";
/* =========================
   Supabaseからメッセージ読み込み
========================= */

async function loadMessages() {

    const { data, error } = await supabaseClient
        .from("messages")
        .select("*")
        .eq("chat_id", PUBLIC_CHAT_ID)
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

    messages.scrollTop =
        messages.scrollHeight;
}

/* =========================
   メッセージ表示
========================= */

function renderMessage(message) {

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
        <div class="message-avatar">G</div>

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

                renderMessage(
                    payload.new
                );

                messages.scrollTop =
                    messages.scrollHeight;
            }
        )
        .subscribe(status => {

            console.log(
                "Realtime:",
                status
            );

        });
}

async function sendMessage() {

    const text = messageInput.value.trim();

    if (text === "") return;

    sendBtn.disabled = true;

    const { data, error } = await supabaseClient
        .from("messages")
        .insert({
            chat_id: PUBLIC_CHAT_ID,
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

        alert("メッセージを送信できませんでした。");

        sendBtn.disabled = false;

        return;
    }

    console.log(
        "メッセージ保存成功:",
        data
    );

    messageInput.value = "";

    sendBtn.disabled = false;
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
   Supabase 保存
========================= */

async function saveMessage(text) {

    const { data, error } = await supabaseClient
        .from("messages")
        .insert({
            chat_id: null,
            sender_id: null,
            content: text,
            message_type: "text"
        })
        .select()
        .single();

    if (error) {
        console.error("メッセージ保存エラー:", error);
        return null;
    }

    console.log("メッセージ保存成功:", data);

    return data;
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


        chatItems.forEach(item => {

            const name =
                item
                    .querySelector(".chat-name")
                    .textContent
                    .toLowerCase();


            if (
                name.includes(keyword)
            ) {

                item.style.display = "flex";

            } else {

                item.style.display = "none";

            }

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

        if (!file) {
            return;
        }

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

loadMessages();
subscribeToMessages();
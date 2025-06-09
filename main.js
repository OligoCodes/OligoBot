const chatBody = document.querySelector(".chat-body")
const messageInput = document.querySelector(".message-input")
const sendMessageButton = document.querySelector("#send-message")
const fileInput = document.querySelector("#file-input")
const fileUploadWrapper= document.querySelector(".file-upload-wrapper")
const fileCancelButton = document.querySelector("#file-cancel")
const chatBotToggler = document.querySelector("#chatbot-toggler")
const closeChatBot = document.querySelector("#close-chatbot")
const getCurrentTimeStamp = () => {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

//API setup 
const API_BACKEND_URL = "https://gemini-backend-c8ta.onrender.com/api/chat";


const userData = {
  message: null,
  file: {
    data: null,
    mime_type: null
  }
}

const chatHistory = [];
const initialInputHeight = messageInput.scrollHeight;


//create a message element with dynamic class and return it
const createMessageElement = (content,...classes) => {
  const div = document.createElement('div');
  div.classList.add("message",...classes)
  
  const timestamp = `<div class="timestamp">${getCurrentTimeStamp()}</div>`;
  div.innerHTML = content + timestamp;
  return div;
};

//Generate bot response using API
const generateBotResponse = async(incomingMessageDiv) => {
  const messageElement = incomingMessageDiv.querySelector(".message-text");
  
  //Add user message to chat History 
  chatHistory.push({
    role: "user",
    parts: [{ 
      text: userData.message },...(userData.file.data ? [{ inline_data: userData.file }] : [])]});
  
  //API requests options
  const requestOptions = {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    contents: chatHistory
  })
};;
  
  try{
    const response = await fetch(API_BACKEND_URL, requestOptions);
    const data = await response.json();
    if(!response.ok) throw new Error(data.error.message);
    
    //Extract and display bot's response text 
    const apiResponseText = data.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, "$1").trim();
    messageElement.innerText = apiResponseText;
    
    //Add bot response to chatHistory 
    chatHistory.push({
    role: "model",
    parts: [{text: apiResponseText}]
    });
  }catch(error){
    console.log(error);
    messageElement.innerText = error.message;
    messageElement.style.color = "#ff0000";
  } finally {
    //Reset user's file data, removing thinking indicator and scrollchat to bottom
    userData.file = {};
    incomingMessageDiv.classList.remove('thinking');
    chatBody.scrollTo({top: chatBody.scrollHeight, behavior: "smooth"});
  }
};

//Handle outgoing user messages 
const handleOutgoingMessage = (e) => {
  e.preventDefault();
  userData.message = messageInput.value.trim();
  messageInput.value = "";
  fileUploadWrapper.classList.remove("file-uploaded")
  messageInput.dispatchEvent(new Event("input"));
  
  //Create and display user message
  const messageContent = `<div class="message-text"></div>${userData.file.data ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment"/>` : ""}` ;
  
  const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
  outgoingMessageDiv.querySelector(".message-text").textContent = userData.message;
  chatBody.appendChild(outgoingMessageDiv);
  chatBody.scrollTo({top: chatBody.scrollHeight, behavior: "smooth"});
  
  //simulate bot response with thinking indicator after delay
  setTimeout(() => {
    const messageContent = `<svg class="bot-avatar" width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Antenna -->
            <circle cx="32" cy="10" r="2" fill="currentColor"/>
            <line x1="32" y1="12" x2="32" y2="18" stroke="currentColor" stroke-width="2"/>

            <!-- Bot Head -->
            <rect x="16" y="18" width="32" height="28" rx="6" fill="currentColor"/>

            <!-- Ears / Side Antennas -->
            <rect x="12" y="26" width="4" height="12" rx="1" fill="currentColor"/>
            <rect x="48" y="26" width="4" height="12" rx="1" fill="currentColor"/>

            <!-- Eyes -->
            <circle cx="24" cy="32" r="3" fill="#ffffff"/>
            <circle cx="40" cy="32" r="3" fill="#ffffff"/>

            <!-- Mouth / Speaker Bar -->
            <rect x="26" y="40" width="12" height="2" rx="1" fill="#ffffff"/>
        </svg>
        <div class="message-text">
          <div class="thinking-indicator">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
        </div>`;
  
    const incomingMessageDiv = createMessageElement(messageContent, "bot-message", "thinking");
    chatBody.appendChild(incomingMessageDiv);
    chatBody.scrollTo({top: chatBody.scrollHeight, behavior: "smooth"});
    generateBotResponse(incomingMessageDiv);
  }, 600);
}

//Handle enter key press for sending messages
messageInput.addEventListener("keydown", (e) => {
  const userMessage = e.target.value.trim();
  if(e.key === "Enter" && userMessage && !e.shiftKey && window.innerWidth > 768){
    handleOutgoingMessage(e);
  }
});

//Adjusting input field height dynamically 
messageInput.addEventListener("input", () => {
  messageInput.style.height = `${initialInputHeight}px`;
  messageInput.style.height = `${messageInput.scrollHeight}px`;
  document.querySelector(".chat-form").style.borderRadius = messageInput.scrollHeight > initialInputHeight ? "15px" : "32px";
})

//Handle file Input change and preview the selected file
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  
  // Converting file to base 64 format
  const reader = new FileReader();
  reader.onload = (e) => {
    fileUploadWrapper.querySelector("img").src = e.target.result;
    fileUploadWrapper.classList.add("file-uploaded");
    
    const base64String = e.target.result.split(",")[1];
    
    //Store file data in userData
    userData.file = {
      data: base64String,
      mime_type: file.type
  }
    fileInput.value = "";
  }
  
  reader.readAsDataURL(file)
})

//cancel file upload 
fileCancelButton.addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("file-uploaded")
});

//initialise emoji picker and handle emoji selection
const picker = new EmojiMart.Picker({
  theme: "light",
  skinTonePosition: "none",
  previewPosition: "none",
  onEmojiSelect: (emoji) => {
    const {selectionStart: start, selectionEnd: end } = messageInput;
    messageInput.setRangeText(emoji.native, start, end, "end");
    messageInput.focus();
  },
  onClickOutside: (e) => {
    if(e.target.id === "emoji-picker"){
      document.body.classList.toggle("show-emoji-picker");
    }else{
      document.body.classList.remove("show-emoji-picker");
    }
  }
});


document.querySelector(".chat-form").appendChild(picker);

sendMessageButton.addEventListener("click" , (e) => handleOutgoingMessage(e));
document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());
chatBotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));
closeChatBot.addEventListener("click", () => document.body.classList.remove("show-chatbot"));

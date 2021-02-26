const client = require("./client.js")
const core = require('@actions/core');
const github = require('@actions/github');

const run = async () => {
    // Get the bot's username
    const {status, data: {login: botName}} = await client.users.getAuthenticated();
    if (status !== 200) {
        throw new Error(`Received unexpected API status code ${status} while looking for bot's username.`);
    }
    client.cfg.botName = botName;

    const context = github.context;
    if(context.eventName !== "issue_comment") return;

    const payload = context.payload;
    if(payload.action === "created") {
        parse_comment(payload);
    }
};

function parse_comment(payload) {
    const data = payload.comment;
    const commenter = data.user.login;
    const body = data.body;
    const username = client.cfg.botName;

    if (commenter === username || !body) return;

    const prefix = RegExp(`@${username} +(\\w+)( +(--\\w+|"[^"]+"))*`, "g");
    const parsed = body.match(prefix);
    if (!parsed) return;

    parsed.forEach(command => {
        const codeBlocks = [`\`\`\`\r\n${command}\r\n\`\`\``, `\`${command}\``];
        if (codeBlocks.some(block => body.includes(block))) return;
        const [, keyword] = command.replace(/\s+/, " ").split(" ");
        const args = command.replace(/\s+/, " ").split(" ").slice(2).join(" ");
        const file = client.commands.get(keyword);
    
        if (file) {
            file.run.apply(client, [payload, commenter, args]);
        }
    });
}


// Run the script
try {
    run();
} catch (error) {
    core.setFailed(error.message);
}
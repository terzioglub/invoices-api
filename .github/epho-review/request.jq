def process_env: {
  GITHUB_TOKEN: env.GH_TOKEN,
  GH_REPO: env.GH_REPO,
  REPO_DIR: "/tmp/agent-runner-persistent/\(env.GH_REPO | sub("/"; "__"))",
  WEB_REPO_DIR: "/tmp/agent-runner-persistent/\(env.WEB_REPO | sub("/"; "__"))",
  PR_NUMBER: env.PR_NUMBER,
  HEAD_SHA: env.HEAD_SHA,
  HEAD_REF: env.HEAD_REF,
  BASE_REF: env.BASE_REF,
  BEFORE_SHA: env.BEFORE_SHA
} | with_entries(select((.value // "") != ""));

def per_turn: {
  provider_api_key: env.OPENCODE_KEY,
  repos: [
    { url: "https://github.com/\(env.GH_REPO)", branch: env.HEAD_REF, token: env.GH_TOKEN },
    { url: "https://github.com/\(env.WEB_REPO)", branch: "main", token: env.WEB_REPO_TOKEN }
  ],
  process_env: process_env
};

if $chat_id == "" then
  per_turn + {
    harness: "opencode",
    model: "opencode/gpt-6.1-sol",
    system_prompt: $system_prompt,
    skills: $skills[0],
    mcp_servers: [
      { name: "supabase", type: "http", url: env.SUPABASE_MCP_URL,
        headers: { Authorization: "Bearer \(env.SUPABASE_ACCESS_TOKEN)" } }
    ],
    prompt: "Review this pull request and post your review."
  }
else
  per_turn + {
    chat_id: $chat_id,
    prompt: $follow_up
  }
end

//! Native OpenAI-compatible completion.
//!
//! Security contract (Task 13 step 2/3):
//! * The API Key lives only in the OS credential store (service `motioncaption.llm`).
//! * No command argument, serialized setting, error message or log line may
//!   contain the Key; every error goes through [`redact`] before leaving Rust.
//! * Responses are size capped and timeouts are enforced natively.

use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::time::Duration;

pub const KEY_SERVICE: &str = "motioncaption.llm";
pub const KEY_ACCOUNT: &str = "openai-compatible-api-key";

/// Hard ceiling on a completion response body (1 MiB).
pub const MAX_RESPONSE_BYTES: usize = 1024 * 1024;
pub const DEFAULT_TIMEOUT_MS: u64 = 60_000;
pub const MAX_TIMEOUT_MS: u64 = 300_000;
const REDACTED: &str = "[redacted]";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletionRequest {
    pub base_url: String,
    pub model: String,
    pub system: String,
    pub messages: Vec<ChatMessage>,
    pub max_output_chars: Option<usize>,
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
struct WireMessage {
    role: String,
    content: String,
}

#[derive(Debug, Clone, Serialize)]
struct WireRequest {
    model: String,
    messages: Vec<WireMessage>,
    temperature: f32,
}

#[derive(Debug, Clone, Deserialize)]
struct WireResponse {
    choices: Vec<WireChoice>,
}

#[derive(Debug, Clone, Deserialize)]
struct WireChoice {
    message: WireMessageOut,
}

#[derive(Debug, Clone, Deserialize)]
struct WireMessageOut {
    content: Option<String>,
}

/// Replaces every occurrence of the secret (and its `Bearer ` form) in `text`.
pub fn redact(text: &str, secrets: &[&str]) -> String {
    let mut output = text.to_string();
    for secret in secrets {
        if secret.is_empty() {
            continue;
        }
        output = output.replace(secret, REDACTED);
        output = output.replace(&format!("Bearer {}", secret), REDACTED);
    }
    // Belt and braces: any literal Authorization header value is stripped too.
    for marker in ["authorization", "Authorization", "api-key", "apiKey"] {
        if let Some(start) = output.find(marker) {
            let rest = &output[start + marker.len()..];
            let value_len = rest
                .chars()
                .take_while(|character| !matches!(character, '\n' | '\r' | '"' | '\'' | ',' | ')'))
                .count();
            if value_len > 0 && rest.chars().take(value_len).any(|character| !character.is_whitespace() && character != ':') {
                let replaced: String = rest.chars().skip(value_len).collect();
                output = format!("{}{}{}", &output[..start + marker.len()], REDACTED, replaced);
            }
        }
    }
    output
}

/// Rejects anything that is not an http(s) endpoint so a hostile Base URL can
/// never point the native client at `file://` or another scheme.
pub fn sanitize_base_url(base_url: &str) -> Result<String, String> {
    let trimmed = base_url.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return Err("Base URL 为空。".to_string());
    }
    let lower = trimmed.to_ascii_lowercase();
    if !lower.starts_with("https://") && !lower.starts_with("http://") {
        return Err("Base URL 必须以 http:// 或 https:// 开头。".to_string());
    }
    Ok(trimmed.to_string())
}

/// Enforces the response-size cap before the body is parsed.
pub fn enforce_size_cap(bytes: &[u8]) -> Result<(), String> {
    if bytes.len() > MAX_RESPONSE_BYTES {
        return Err(format!(
            "响应体超过上限（{} 字节 > {} 字节），已丢弃。",
            bytes.len(),
            MAX_RESPONSE_BYTES
        ));
    }
    Ok(())
}

/// Extracts the first choice's text content from an OpenAI-compatible payload.
pub fn extract_content(body: &[u8]) -> Result<String, String> {
    let parsed: WireResponse = serde_json::from_slice(body)
        .map_err(|error| format!("无法解析模型响应：{}", error))?;
    let content = parsed
        .choices
        .first()
        .and_then(|choice| choice.message.content.clone())
        .ok_or_else(|| "模型响应中没有可读取的文本。".to_string())?;
    Ok(content)
}

fn credential_entry() -> Result<Entry, String> {
    Entry::new(KEY_SERVICE, KEY_ACCOUNT).map_err(|error| format!("凭据存储不可用：{}", error))
}

fn stored_key() -> Result<Option<String>, String> {
    match credential_entry()?.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(format!("读取凭据失败：{}", error)),
    }
}

/// Writes the Key into the OS credential store. The Key never touches disk.
pub fn save_api_key(key: &str) -> Result<(), String> {
    if key.trim().is_empty() {
        return Err("API Key 不能为空。".to_string());
    }
    credential_entry()?
        .set_password(key)
        .map_err(|error| redact(&format!("保存凭据失败：{}", error), &[key]))
}

/// The frontend only ever learns whether a Key exists.
pub fn has_api_key() -> bool {
    matches!(stored_key(), Ok(Some(_)))
}

/// Issues the request natively: Rust reads the Key, never the frontend.
pub async fn complete(request: &CompletionRequest) -> Result<String, String> {
    let key = stored_key()?.ok_or_else(|| "尚未配置 API Key。".to_string())?;
    let secrets: [&str; 1] = [key.as_str()];
    let result = complete_with_key(request, &key).await;
    result.map_err(|error| redact(&error, &secrets))
}

async fn complete_with_key(request: &CompletionRequest, key: &str) -> Result<String, String> {
    let base_url = sanitize_base_url(&request.base_url)?;
    let timeout = request.timeout_ms.unwrap_or(DEFAULT_TIMEOUT_MS).clamp(1_000, MAX_TIMEOUT_MS);
    if request.model.trim().is_empty() {
        return Err("缺少模型名称。".to_string());
    }

    let mut messages = Vec::with_capacity(request.messages.len() + 1);
    if !request.system.trim().is_empty() {
        messages.push(WireMessage { role: "system".to_string(), content: request.system.clone() });
    }
    for message in &request.messages {
        messages.push(WireMessage { role: message.role.clone(), content: message.content.clone() });
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(timeout))
        .build()
        .map_err(|error| format!("无法创建 HTTP 客户端：{}", error))?;

    let url = format!("{}/chat/completions", base_url);
    let response = client
        .post(&url)
        .header(reqwest::header::CONTENT_TYPE, "application/json")
        // The Key is attached here and nowhere else; errors are redacted above.
        .bearer_auth(key)
        .json(&WireRequest { model: request.model.clone(), messages, temperature: 0.2 })
        .send()
        .await
        .map_err(|error| format!("请求失败：{}", error))?;

    let status = response.status();
    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("读取响应失败：{}", error))?;
    enforce_size_cap(&bytes)?;

    if !status.is_success() {
        let detail = String::from_utf8_lossy(&bytes).chars().take(400).collect::<String>();
        return Err(format!("模型服务返回 {}：{}", status.as_u16(), detail));
    }

    let mut content = extract_content(&bytes)?;
    if let Some(limit) = request.max_output_chars {
        if content.chars().count() > limit {
            content = content.chars().take(limit).collect();
        }
    }
    Ok(content)
}

#[cfg(test)]
mod tests {
    use super::*;

    const SECRET: &str = "sk-live-abcdef123456";

    #[test]
    fn redacts_the_raw_secret() {
        assert!(!redact(&format!("boom {}", SECRET), &[SECRET]).contains(SECRET));
    }

    #[test]
    fn redacts_bearer_headers() {
        let text = format!("Authorization: Bearer {} failed", SECRET);
        let redacted = redact(&text, &[SECRET]);
        assert!(!redacted.contains(SECRET));
        assert!(redacted.contains(REDACTED));
    }

    #[test]
    fn redaction_is_a_no_op_without_secrets() {
        assert_eq!(redact("plain failure", &[]), "plain failure");
    }

    #[test]
    fn rejects_non_http_base_urls() {
        assert!(sanitize_base_url("file:///etc/passwd").is_err());
        assert!(sanitize_base_url("ftp://example.com").is_err());
        assert!(sanitize_base_url("").is_err());
    }

    #[test]
    fn normalizes_http_base_urls() {
        assert_eq!(sanitize_base_url("https://api.example.com/v1/").unwrap(), "https://api.example.com/v1");
        assert_eq!(sanitize_base_url(" http://localhost:11434/v1 ").unwrap(), "http://localhost:11434/v1");
    }

    #[test]
    fn enforces_the_response_size_cap() {
        assert!(enforce_size_cap(&[0u8; 16]).is_ok());
        assert!(enforce_size_cap(&[0u8; MAX_RESPONSE_BYTES + 1]).is_err());
    }

    #[test]
    fn extracts_the_first_choice_content() {
        let body = br#"{"choices":[{"message":{"role":"assistant","content":"{\"effects\":[]}"}}]}"#;
        assert_eq!(extract_content(body).unwrap(), "{\"effects\":[]}");
    }

    #[test]
    fn reports_a_missing_choice() {
        assert!(extract_content(br#"{"choices":[]}"#).is_err());
    }

    #[test]
    fn serialized_request_never_carries_the_key() {
        let request = CompletionRequest {
            base_url: "https://api.example.com/v1".to_string(),
            model: "gpt".to_string(),
            system: "sys".to_string(),
            messages: vec![ChatMessage { role: "user".to_string(), content: "hi".to_string() }],
            max_output_chars: Some(10),
            timeout_ms: Some(1_000),
        };
        let json = serde_json::to_string(&request).unwrap();
        assert!(!json.contains(SECRET));
        assert!(json.contains("\"baseUrl\""));
    }
}

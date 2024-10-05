use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::error::Error;
use std::time::Duration;
use tauri::Window;
use tokio::time::timeout;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use tauri::Emitter;

#[derive(Debug, Serialize, Deserialize)]
struct VoteItem {
    index: usize,
    item: String,
    count: usize,
}

pub async fn connect_websocket(
    youtubeid: &str,
    twitchid: &str,
    voteiteminit: Vec<String>,
    duration: u64,
    window: Window,
) -> Result<(), Box<dyn Error>> {
    let mut voteduser: Vec<String> = Vec::new();
    let voteitem: Vec<String> = voteiteminit.clone();
    let mut vote_items: Vec<VoteItem> = voteitem
        .clone()
        .into_iter()
        .map(|item| VoteItem {
            index: voteiteminit.iter().position(|x| *x == item).unwrap() + 1,
            item: item.to_string(),
            count: 0,
        })
        .collect();
    // Define the WebSocket URL
    let url = "wss://play-ground.dev:6004/v2/protocol/json";
    // Connect to the WebSocket server
    let (ws_stream, _) = connect_async(url).await.expect("Failed to connect");

    println!("WebSocket connected");

    // Split the WebSocket stream into a sender and receiver
    let (mut write, mut read) = ws_stream.split();

    if youtubeid != "" {
        println!("youtubeid: {}", youtubeid);
        let message = json!({
            "event": "subscribe",
            "payload": {
                "type": "live",
                "source": {
                    "platform": "youtube",
                    "channel": youtubeid
                }
            },
            "ref": "1"
        });
        let msg_text = serde_json::to_string(&message)?;
        let msg = Message::Text(msg_text);
        write.send(msg).await.expect("Failed to send message");
    }
    if twitchid != "" {
        println!("twitchid: {}", twitchid);
        let message_2 = json!({
          "event": "subscribe",
          "payload": {
            "type": "live",
            "source": {
              "platform": "twitch",
              "channel": twitchid
            }
          },
          "ref": "1"
        });
        let msg_text_2 = serde_json::to_string(&message_2)?;
        // Send a message to the server
        let msg_2 = Message::Text(msg_text_2);
        write.send(msg_2).await.expect("Failed to send message");
    }
    let duration = Duration::from_secs(duration);
    match timeout(duration, async {
        while let Some(Ok(msg)) = read.next().await {
            if let Message::Text(text) = msg {
                println!("Received: {}", text);
                let parsed_json: Value = serde_json::from_str(&text).expect("REASON");
                if let Some(data_array) = parsed_json
                    .pointer("/payload/data")
                    .and_then(|v| v.as_array())
                {
                    for item in data_array {
                        if let (Some(nickname), Some(content)) = (
                            item.get("nickname").and_then(Value::as_str),
                            item.get("content").and_then(Value::as_str),
                        ) {
                            match content.parse::<usize>() {
                                Ok(content_number) if content_number <= voteitem.len() => {
                                    println!(
                                        "Nickname: {}, Content: {} (within array length)",
                                        nickname, content_number
                                    );
                                    if !voteduser.contains(&nickname.to_string()) {
                                        voteduser.push(nickname.to_string());
                                        println!("voteduser: {:?}", voteduser);
                                        vote_items[content_number - 1].count += 1;
                                        window
                                            .emit(
                                                "ws-lastvote",
                                                nickname.to_string()
                                                    + " - "
                                                    + &vote_items[content_number - 1].item,
                                            )
                                            .unwrap();
                                    } else {
                                        println!("voted user already voted");
                                    }
                                }
                                Ok(_) => {
                                    println!("voted item is not in voteitem array");
                                }
                                Err(_) => {
                                    println!("do not need to work");
                                }
                            }
                        }
                    }
                } else {
                    println!("Key 'key' not found in JSON");
                }
                window.emit("ws-message", &vote_items).unwrap();
            }
        }
    })
    .await
    {
        Ok(_) => println!("Completed within the duration"),
        Err(_) => {
            println!("Timeout reached");
            window.emit("ws-end", "end").unwrap();
        }
    }

    Ok(())
}

import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from '@tauri-apps/api/event';
import CountdownTimer from "./countdownTimer";
import "./App.css";

function App() {
  const [youtubeid, setYoutubeid] = useState(localStorage.getItem("youtubeid") || "");
  const [twitchid, setTwitchid] = useState(localStorage.getItem("twitchid") ||"");
  const [voteItemList, setVoteItemList] = useState([]);
  const [voteiteminit, setVoteiteminit] = useState([]);
  const [newvoteitem, setNewvoteitem] = useState("");
  const [duration, setDuration] = useState(60);
  const [isVoting, setIsVoting] = useState(false);
  const [end, setEnd] = useState(false);
  const [message, setMessage] = useState([])

  function isValidUrl(url) {
    try {
        new URL(url);
        console.log("it is a url")
        return true; // 如果没有抛出错误，则是有效的 URL
    } catch (error) {
        console.log("it is not a url")
        return false; // 如果抛出错误，则不是有效的 URL
    }
  }


  async function startVote() {
    console.log("clicked")
    if((youtubeid == "" && twitchid == "") || voteiteminit.length == 0 || isVoting){
      return
    }
    if(isValidUrl(youtubeid) == true){
      const urlObj = new URL(youtubeid);
      var _youtubeid = urlObj.searchParams.get('v')
      setYoutubeid(_youtubeid)
    }
    localStorage.setItem("youtubeid",youtubeid);
    localStorage.setItem("twitchid",twitchid);
    invoke("connect_websocket_command",{youtubeid,twitchid,voteiteminit,duration});
    setIsVoting(true);
    listen('ws-message', (event) => {
      console.log('Received message from WebSocket:', event.payload);
      setVoteItemList(event.payload.sort((a,b)=> b.count - a.count));
      // Update the interface with the received message
    });
    listen('ws-lastvote', (event) => {
      let temp = [...voteItemList];
      temp.push(event.payload);
      setMessage(temp);
    })
    listen('ws-end', (event) => {
      // Update the interface with the received message
      console.log("end")
      setEnd(true);
    });
  }

 
  const restart=()=>{
    console.log(youtubeid)
    if(end != true){
      return
    }
    setMessage([]);
    setVoteItemList([]);
    setYoutubeid(localStorage.getItem("youtubeid"));
    setTwitchid(localStorage.getItem("twitchid"));
    setEnd(false);
    setIsVoting(false);
  }

  return (
    <div className="container">
      <h1>Welcome to Vote app!</h1>
      {!isVoting &&
        <div
          className="column"
          style={{width:"80%",border:"1px solid gray",padding:"20px",borderRadius:"10px"}}
        >
        <div style={{display:'flex',flexDirection:"column",width:"80%"}}>
          <label style={{alignSelf:"flex-start", fontSize:"15px",marginLeft:"2px"}}>Youtube Url</label>
          <input
            id="greet-input"
            value={youtubeid}
            onChange={(e) => setYoutubeid(e.currentTarget.value)}
            //placeholder="Enter youtube URL..."
          />
        </div>
        <div style={{display:'flex',flexDirection:"column",width:"80%"}}>
          <label style={{alignSelf:"flex-start", fontSize:"15px",marginLeft:"2px"}}>Twitch Url</label>
          <input
            value={twitchid}
            id="greet-input"
            onChange={(e) => setTwitchid(e.currentTarget.value)}
            //placeholder="Enter a name..."
          />
        </div>
        <div style={{display:'flex',flexDirection:"column",width:"80%"}}>
          <label style={{alignSelf:"flex-start", fontSize:"15px",marginLeft:"2px"}}>Duration</label>
          <input
            id="greet-input"
            onChange={(e) => setDuration(e.currentTarget.value)}
            value={duration}
            //placeholder="Enter a name..."
          />
        </div>
        <div style={{display:'flex',flexDirection:"column",width:"80%",gap:"10px"}}>
          <div style={{display:"flex",justifyContent:"flex-start",gap:"5px"}}>
          <label style={{alignSelf:"flex-end", fontSize:"15px",marginLeft:"2px"}}>Vote items</label>
          </div>
          <div style={{display:'flex',flexDirection:"row",width:"100%",justifyContent:"space-between",gap:"5px"}}>
            <input
                id="greet-input"
                style={{width:"90%",borderRadius:"5px"}}
                value={newvoteitem}
                onChange={(e) => setNewvoteitem(e.currentTarget.value)}
            />
            <button style={{width:"10px",display: "flex", alignItems: "center", justifyContent: "center"}} onClick={()=>{
              if(newvoteitem.trim().length>0){
                setVoteiteminit([...voteiteminit,newvoteitem]);
                setNewvoteitem("");
              }
            }}>+</button>
            </div>
          {
            voteiteminit.length>0 &&
            voteiteminit.map((item,index)=>{
              return(
                <div key={item+index+"ddd"} style={{display:'flex',flexDirection:"row",width:"100%",justifyContent:"space-between",gap:"5px"}}>
                  <div
                  key={item+index+"div"}
                    //id="greet-input"
                    style={{width:"90%",border:"1px solid gray",display: "flex", alignItems: "center", justifyContent: "center",borderRadius:"5px"}}
                    //placeholder="Enter a name..."
                  >
                    {index+1}. {item}
                  </div>
                  <button 
                  disabled={isVoting}
                  style={{width:"10px",display: "flex", alignItems: "center", justifyContent: "center"}} 
                  onClick={()=>{
                    let temp = [...voteiteminit];
                    temp.splice(index,1);
                    setVoteiteminit(temp);
                  }}>-</button>
                </div>
              )
            })
          }
        </div>
        <div style={{display:'flex',flexDirection:"column",width:"80%"}}>
          <button style={{alignSelf:"flex-end"}} onClick={startVote}>Start Vote</button>
        </div>
      </div>}
      
      {
      isVoting &&
      <div className="column"
            style={{width:"80%",border:"1px solid gray",padding:"20px",borderRadius:"10px"}}>
        <h3>Vote Result</h3>
        {isVoting&& <CountdownTimer initialTime={duration} />}
        {
        voteItemList.length > 0 &&
        <div>
        {
          voteItemList.map((item, index) => (
            <div key={index}> 
              <p>{item.index}. {item.item} : {item.count}</p>
            </div>
          ))
        }
        </div>
        }
        
        {end && <button onClick={restart}>restart</button>}
        {
          message.length > 0 &&
          <div>
            <h4>Last vote</h4>
          {
            message.slice(-3).map((item, index) => (
              <div key={index}> 
                <p>{item}</p>
              </div>
            ))
          }
          </div>
        }
      </div>
      }
    </div>
  );
}

export default App;

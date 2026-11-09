(function(){
function hdr(w,h,inner){return '<svg viewBox="0 0 '+w+' '+h+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="stage diagram" font-family="sans-serif">'+inner+'</svg>';}
var stage=hdr(360,230,'<rect x="20" y="20" width="320" height="150" fill="#f6e9d7" stroke="#2a2340" stroke-width="3"/><g stroke="#2a2340" stroke-dasharray="4 4"><line x1="127" y1="20" x2="127" y2="170"/><line x1="233" y1="20" x2="233" y2="170"/><line x1="20" y1="70" x2="340" y2="70"/><line x1="20" y1="120" x2="340" y2="120"/></g><text x="180" y="196" text-anchor="middle" font-size="14" font-weight="700">AUDIENCE</text><g font-size="18" font-weight="700" fill="#c0392b" text-anchor="middle"><text x="73" y="50">1</text><text x="180" y="50">2</text><text x="287" y="50">3</text><text x="73" y="150">4</text><text x="180" y="150">5</text><text x="287" y="150">6</text></g>');
ONTI_REGISTER({key:"drama",subject:"Creative Arts: Drama",title:"Creative Arts: Drama Practice (bonus)",emoji:"🎭",minutes:20,
blurb:"A bonus drama paper from your past papers: elements of drama, the stage, theatre jobs and the Globe Theatre.",
topics:{
 elem:{label:"Elements of drama",tips:["Elements: role, character, focus, tension, space, time, mood, symbol, contrast.","Dialogue is characters talking. A monologue is one character speaking alone."],search:["elements of drama grade 7"]},
 stage:{label:"The stage",tips:["Stage positions: upstage (far from audience), downstage (close to audience), left/right are from the ACTOR facing the audience.","The fourth wall is the imaginary wall between actors and audience."],search:["stage positions upstage downstage"]},
 jobs:{label:"Theatre jobs",tips:["Director: guides the actors. Stage manager: runs the show backstage. Agent: finds roles for actors. Presenter: hosts a show.","Props are objects used on stage. Costumes and make-up help create characters."],search:["theatre jobs director stage manager"]},
 globe:{label:"The Globe Theatre",tips:["The Globe Theatre in London was built in 1599 and Shakespeare's plays were performed there."],search:["Globe Theatre Shakespeare kids"]}
},
questions:[
 MC("stage","The imaginary wall between the actors and the audience is called the...",["fourth wall","back wall","green room","backdrop"],0,"The fourth wall."),
 MC("stage","Which part of the stage is CLOSEST to the audience?",["Upstage","Downstage","Backstage","Offstage"],1,"Downstage is closest to the audience.",{svg:stage}),
 MC("stage","Which numbered block is DOWNSTAGE CENTRE (closest to the audience, in the middle)?",["2","5","4","6"],1,"The audience is at the bottom, so downstage is the bottom row; centre is the middle block (5).",{svg:stage}),
 MC("stage","Which numbered block is UPSTAGE CENTRE?",["2","5","1","3"],0,"Upstage is the top row (furthest from the audience), centre is block 2.",{svg:stage}),
 MC("jobs","Who is responsible for running everything backstage during a show?",["Stage manager","Audience","Presenter","Agent"],0,"The stage manager makes sure sound, lights and props happen at the right time."),
 MC("jobs","A person who hires out an actor to find acting jobs is an...",["agent","director","audience","designer"],0,"An agent promotes actors to get them roles."),
 MC("jobs","A person who hosts a show on radio or television is a...",["presenter","director","stage manager","playwright"],0,"A presenter hosts."),
 MC("elem","'Projection' in drama means...",["throwing your voice so the audience can hear you","walking fast","hiding on stage","painting a backdrop"],0,"Projecting your voice means speaking loudly and clearly to the back of the room."),
 MC("elem","A story made up to teach a lesson is a...",["fable","news report","map","timetable"],0,"A fable (like Aesop's) has a moral."),
 MC("elem","Imagination is...",["the power of forming pictures in your mind","remembering a phone number","a type of costume","a stage direction"],0,"Imagination helps actors create characters and worlds."),
 MC("globe","Where is the Globe Theatre found?",["London","Cape Town","Paris","New York"],0,"The Globe stands on the south bank of the River Thames in London."),
 MC("globe","Whose plays were performed at the Globe Theatre?",["William Shakespeare","Charles Dickens","Roald Dahl","Hans Andersen"],0,"William Shakespeare was part of the company that used the Globe."),
 NUM("globe","In which year was the original Globe Theatre built?",1599,"The Globe was built in 1599."),
 TF("elem","In a dialogue, only one person speaks.",false,"Dialogue is a conversation between two or more characters.")
]});})();

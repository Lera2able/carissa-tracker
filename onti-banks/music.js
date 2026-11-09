(function(){
function hdr(w,h,inner){return '<svg viewBox="0 0 '+w+' '+h+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="music diagram" font-family="sans-serif">'+inner+'</svg>';}
function staff(y){var s='';for(var i=0;i<5;i++)s+='<line x1="10" y1="'+(y+i*10)+'" x2="410" y2="'+(y+i*10)+'" stroke="#2a2340"/>';return s;}
function note(x,y,filled,stem,flag){return '<ellipse cx="'+x+'" cy="'+y+'" rx="7" ry="5" fill="'+(filled?'#2a2340':'#fff')+'" stroke="#2a2340" stroke-width="2" transform="rotate(-20 '+x+' '+y+')"/>'+(stem?'<line x1="'+(x+6)+'" y1="'+y+'" x2="'+(x+6)+'" y2="'+(y-32)+'" stroke="#2a2340" stroke-width="2"/>':'')+(flag?'<path d="M'+(x+6)+','+(y-32)+' q10,8 6,20" fill="none" stroke="#2a2340" stroke-width="2"/>':'');}
var notes=hdr(420,130,'<g>'+staff(30)+'</g>'+note(50,60,false,false,false)+note(130,60,false,true,false)+note(210,60,true,true,false)+note(290,60,true,true,true)+'<g font-size="15" font-weight="700" text-anchor="middle" fill="#c0392b"><text x="50" y="115">A</text><text x="130" y="115">B</text><text x="210" y="115">C</text><text x="290" y="115">D</text></g>');
var clef=hdr(420,110,'<g>'+staff(25)+'</g><path d="M40,20 C56,32 50,58 36,62 C20,64 18,44 32,42 C46,42 46,60 38,78 C34,90 22,92 22,84 M40,15 V84" fill="none" stroke="#2a2340" stroke-width="3" stroke-linecap="round"/>'+note(120,55,true,true,false)+note(170,50,true,true,false)+note(220,45,true,true,false)+note(270,40,true,true,false)+'<text x="330" y="70" font-size="12" fill="#6f6888">(notes going up the staff)</text>');
var vol=hdr(420,100,'<g font-size="20" font-style="italic" font-weight="700" fill="#6d3fc0" text-anchor="middle"><text x="60" y="55">p</text><text x="160" y="55">mf</text><text x="260" y="55">f</text><text x="360" y="55">ff</text></g><g font-size="12" fill="#6f6888" text-anchor="middle"><text x="60" y="80">?</text><text x="160" y="80">?</text><text x="260" y="80">?</text><text x="360" y="80">?</text></g>');
ONTI_REGISTER({key:"music",subject:"Creative Arts: Music",title:"Creative Arts: Music Practice Exam",emoji:"🎵",minutes:25,
blurb:"Notes and rests, the staff, dynamics, tempo, instruments and African music. Listen for the answers in your head!",
topics:{
 notes:{label:"Notes and rests",tips:["Semibreve = 4 beats, minim = 2 beats, crotchet = 1 beat, quaver = 1/2 beat.","A hollow note with a stem is a minim; a filled note with a stem is a crotchet."],search:["note values semibreve minim crotchet quaver"]},
 theory:{label:"Music theory",tips:["The staff has 5 lines and 4 spaces. The treble clef is for higher notes.","Notes higher on the staff sound higher (higher pitch).","Time signature 4/4 = 4 crotchet beats in every bar."],search:["treble clef staff notes","time signature 4/4"]},
 expr:{label:"Dynamics and tempo",tips:["Dynamics: p (piano) = soft, f (forte) = loud, mf = medium loud, ff = very loud.","Tempo: allegro = fast, andante = walking speed, adagio = slow.","Crescendo = getting louder. Diminuendo = getting softer."],search:["music dynamics piano forte","tempo allegro adagio"]},
 inst:{label:"Instruments and voices",tips:["Families: strings, woodwind, brass, percussion.","Voices from high to low: soprano, alto, tenor, bass."],search:["instrument families orchestra","soprano alto tenor bass"]},
 afr:{label:"African and South African music",tips:["Many African instruments are percussion: djembe, marimba, mbira.","Call and response: a leader sings, the group answers.","Ubuntu and community are strong in South African music styles such as isicathamiya, kwaito and maskandi."],search:["South African music styles","call and response African music"]}
},
questions:[
 MC("notes","Which note (A) is a SEMIBREVE (4 beats)?",["A (hollow, no stem)","B (hollow with stem)","C (filled with stem)","D (filled with stem and flag)"],0,"A semibreve is hollow with no stem.",{svg:notes}),
 MC("notes","Note B is hollow with a stem. How many beats does it last?",["1","2","3","4"],1,"A minim lasts 2 beats.",{svg:notes}),
 MC("notes","Note C is filled with a stem. What is it called?",["Semibreve","Minim","Crotchet","Quaver"],2,"A crotchet lasts 1 beat.",{svg:notes}),
 MC("notes","Note D has a flag. What is it called?",["Quaver","Minim","Crotchet","Semibreve"],0,"A quaver lasts half a beat.",{svg:notes}),
 NUM("notes","In 4/4 time, how many crotchet beats are in ONE bar?",4,"4/4 means four crotchet beats per bar."),
 NUM("notes","How many minims make up one semibreve?",2,"4 beats ÷ 2 beats = 2 minims."),
 NUM("notes","How many quavers fit into one crotchet?",2,"A quaver is half a beat."),
 ORDER("notes","Put these notes in order from LONGEST to shortest.",["Semibreve","Minim","Crotchet","Quaver"],"4, 2, 1 and half a beat."),
 NUM("theory","How many lines does the music staff have?",5,"Five lines and four spaces."),
 MC("theory","What is the sign at the start of the staff called?",["Bass drum","Treble clef","Time signature","Repeat sign"],1,"The treble clef (G clef).",{svg:clef}),
 MC("theory","The notes in the picture go UP the staff. What happens to the pitch?",["It gets higher","It gets lower","It stays the same","It gets louder"],0,"Higher on the staff means higher pitch.",{svg:clef}),
 MC("expr","What does the sign f (forte) mean?",["Soft","Loud","Fast","Slow"],1,"Forte means loud.",{svg:vol}),
 MC("expr","What does the sign p (piano) mean?",["Loud","Soft","Piano instrument","Stop"],1,"Piano means soft.",{svg:vol}),
 MC("expr","Which sign means VERY loud?",["p","mf","f","ff"],3,"ff is fortissimo, very loud.",{svg:vol}),
 MC("expr","'Allegro' tells the musicians to play...",["slowly","fast and lively","softly","loudly"],1,"Allegro = fast."),
 MC("expr","A 'crescendo' means the music gets...",["slower","softer","louder","stops"],2,"Crescendo = gradually louder."),
 MATCH("inst","Match the instrument to its family.",[["Violin","Strings"],["Flute","Woodwind"],["Trumpet","Brass"],["Djembe","Percussion"]],"Strings are plucked/bowed, woodwinds blown, brass buzzed into, percussion struck."),
 MC("inst","Which voice type is the HIGHEST?",["Bass","Tenor","Alto","Soprano"],3,"Soprano is the highest voice."),
 MC("inst","Which is a traditional African thumb piano?",["Mbira","Violin","Trombone","Harp"],0,"The mbira has metal keys plucked by thumbs."),
 MC("afr","In 'call and response' singing...",["Everybody sings the same all the time","A leader sings and the group answers","Nobody sings","Only instruments play"],1,"The leader calls, the group responds."),
 TF("afr","The marimba and djembe are percussion instruments.",true,"Both are played by striking."),
 MC("afr","Which of these is a South African music style?",["Kwaito","Flamenco","Opera","Reggaeton"],0,"Kwaito grew from Johannesburg townships in the 1990s."),
 MC("theory","What do we call the speed of the music?",["Pitch","Tempo","Dynamics","Timbre"],1,"Tempo is the speed; dynamics is loud/soft; pitch is high/low.")
]});})();

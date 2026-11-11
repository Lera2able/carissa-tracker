(function(){
function sv(w,h,inner,label){return '<svg viewBox="0 0 '+w+' '+h+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+label+'" font-family="sans-serif">'+inner+'</svg>';}
function clock(h,m){
 var c='<circle cx="90" cy="90" r="80" fill="#fff" stroke="#6d3fc0" stroke-width="5"/>';
 for(var i=1;i<=12;i++){var a=i*Math.PI/6;c+='<text x="'+(90+64*Math.sin(a)).toFixed(1)+'" y="'+(96-64*Math.cos(a)).toFixed(1)+'" text-anchor="middle" font-size="16" font-weight="700" fill="#2a2340">'+i+'</text>';}
 var ha=((h%12)+m/60)*30*Math.PI/180, ma=m*6*Math.PI/180;
 c+='<line x1="90" y1="90" x2="'+(90+38*Math.sin(ha)).toFixed(1)+'" y2="'+(90-38*Math.cos(ha)).toFixed(1)+'" stroke="#c0392b" stroke-width="6" stroke-linecap="round"/>';
 c+='<line x1="90" y1="90" x2="'+(90+56*Math.sin(ma)).toFixed(1)+'" y2="'+(90-56*Math.cos(ma)).toFixed(1)+'" stroke="#2a2340" stroke-width="4" stroke-linecap="round"/><circle cx="90" cy="90" r="5" fill="#2a2340"/>';
 return sv(180,180,c,'Analogue clock');}
function bar(n,s){var c='';for(var i=0;i<n;i++){c+='<rect x="'+(10+i*(280/n))+'" y="14" width="'+(280/n)+'" height="46" fill="'+(i<s?'#f2b705':'#fff')+'" stroke="#2a2340" stroke-width="3"/>';}return sv(300,74,c,'Fraction bar: '+s+' of '+n+' parts shaded');}
function arr(r,c){var o='';for(var i=0;i<r;i++)for(var j=0;j<c;j++)o+='<circle cx="'+(24+j*34)+'" cy="'+(24+i*34)+'" r="12" fill="#6d3fc0"/>';return sv(24+c*34,24+r*34,o,'Array of dots with '+r+' rows and '+c+' columns');}
function pie(n,s){var o='';for(var i=0;i<n;i++){var a1=i*2*Math.PI/n-Math.PI/2,a2=(i+1)*2*Math.PI/n-Math.PI/2;var x1=80+70*Math.cos(a1),y1=80+70*Math.sin(a1),x2=80+70*Math.cos(a2),y2=80+70*Math.sin(a2);o+='<path d="M80 80 L'+x1.toFixed(1)+' '+y1.toFixed(1)+' A70 70 0 0 1 '+x2.toFixed(1)+' '+y2.toFixed(1)+' Z" fill="'+(i<s?'#43c37c':'#fff')+'" stroke="#2a2340" stroke-width="3"/>';}return sv(160,160,o,'Circle cut into '+n+' equal parts with '+s+' shaded');}
function shape(k){var m={tri:'<polygon points="80,15 145,125 15,125" fill="#ffd9d6" stroke="#c0392b" stroke-width="4"/>',sq:'<rect x="25" y="25" width="100" height="100" fill="#d9f2e3" stroke="#1f8a4c" stroke-width="4"/>',rec:'<rect x="10" y="40" width="140" height="70" fill="#e1d8fa" stroke="#6d3fc0" stroke-width="4"/>',cir:'<circle cx="80" cy="75" r="55" fill="#fff0b3" stroke="#d99a00" stroke-width="4"/>'};return sv(160,150,m[k],'A 2D shape');}
function pict(){var rows=[['🍎',4],['🍌',6],['🍇',3],['🍊',5]],o='';rows.forEach(function(r,i){o+='<text x="10" y="'+(34+i*40)+'" font-size="22">'+r[0]+'</text><text x="60" y="'+(34+i*40)+'" font-size="22" letter-spacing="3">'+new Array(r[1]+1).join('⭐')+'</text>';});o+='<text x="10" y="184" font-size="12" fill="#6f6888">Each ⭐ = 1 learner who chose that fruit</text>';return sv(300,192,o,'Pictograph of favourite fruit');}
function tally(){var o='',d=[['Dogs',7],['Cats',4],['Birds',6]];d.forEach(function(r,i){var y=30+i*42;o+='<text x="10" y="'+y+'" font-size="16" font-weight="700">'+r[0]+'</text>';var n=r[1],g=0,x=80;while(n>=5){o+='<g stroke="#2a2340" stroke-width="3"><line x1="'+x+'" y1="'+(y-18)+'" x2="'+x+'" y2="'+(y+2)+'"/><line x1="'+(x+8)+'" y1="'+(y-18)+'" x2="'+(x+8)+'" y2="'+(y+2)+'"/><line x1="'+(x+16)+'" y1="'+(y-18)+'" x2="'+(x+16)+'" y2="'+(y+2)+'"/><line x1="'+(x+24)+'" y1="'+(y-18)+'" x2="'+(x+24)+'" y2="'+(y+2)+'"/><line x1="'+(x-4)+'" y1="'+(y-4)+'" x2="'+(x+28)+'" y2="'+(y-14)+'"/></g>';x+=46;n-=5;}for(var k=0;k<n;k++){o+='<line x1="'+(x+k*8)+'" y1="'+(y-18)+'" x2="'+(x+k*8)+'" y2="'+(y+2)+'" stroke="#2a2340" stroke-width="3"/>';}});return sv(300,140,o,'Tally chart of favourite pets');}
function numline(){var o='<line x1="20" y1="60" x2="380" y2="60" stroke="#2a2340" stroke-width="3"/>';for(var i=0;i<=10;i++){var x=30+i*34;o+='<line x1="'+x+'" y1="50" x2="'+x+'" y2="70" stroke="#2a2340" stroke-width="2"/><text x="'+x+'" y="92" text-anchor="middle" font-size="14">'+(i*10)+'</text>';}o+='<circle cx="'+(30+6.7*34)+'" cy="60" r="8" fill="#c0392b"/><text x="'+(30+6.7*34)+'" y="36" text-anchor="middle" font-size="13" fill="#c0392b" font-weight="700">?</text>';return sv(400,104,o,'Number line from 0 to 100, a red dot sits between 60 and 70');}
function mon(){var o='';[[10,'R5','#bfe3c8'],[75,'R2','#ffe9a8'],[140,'R2','#ffe9a8'],[205,'R1','#e4e4e4'],[270,'50c','#e4e4e4']].forEach(function(c){o+='<circle cx="'+(c[0]+28)+'" cy="40" r="28" fill="'+c[2]+'" stroke="#2a2340" stroke-width="3"/><text x="'+(c[0]+28)+'" y="46" text-anchor="middle" font-size="16" font-weight="800">'+c[1]+'</text>';});return sv(340,84,o,'Coins: R5, R2, R2, R1 and 50c');}
function cube(){return sv(150,140,'<polygon points="30,50 90,50 90,110 30,110" fill="#c9b8f5" stroke="#2a2340" stroke-width="3"/><polygon points="30,50 60,25 120,25 90,50" fill="#e8defc" stroke="#2a2340" stroke-width="3"/><polygon points="90,50 120,25 120,85 90,110" fill="#a28ae0" stroke="#2a2340" stroke-width="3"/>','A cube');}
function pat(){var o='';['🔴','🔵','🔵','🔴','🔵','🔵','🔴'].forEach(function(e,i){o+='<text x="'+(10+i*42)+'" y="40" font-size="30">'+e+'</text>';});o+='<text x="'+(10+7*42)+'" y="40" font-size="30">❓</text>';return sv(360,56,o,'Pattern of red and blue counters');}
function scale(){return sv(300,150,'<line x1="40" y1="130" x2="260" y2="130" stroke="#2a2340" stroke-width="5"/><polygon points="150,130 130,105 170,105" fill="#6d3fc0"/><line x1="70" y1="95" x2="230" y2="95" stroke="#2a2340" stroke-width="4"/><rect x="45" y="55" width="50" height="40" rx="6" fill="#ffd9d6" stroke="#c0392b" stroke-width="3"/><text x="70" y="82" text-anchor="middle" font-size="16" font-weight="800">2 kg</text><rect x="205" y="55" width="50" height="40" rx="6" fill="#d9f2e3" stroke="#1f8a4c" stroke-width="3"/><text x="230" y="82" text-anchor="middle" font-size="16" font-weight="800">? kg</text><text x="150" y="30" text-anchor="middle" font-size="13" fill="#6f6888">The scale is balanced</text>','Balanced scale');}
ONTI_REGISTER({key:"gr3-maths",subject:"Mathematics",title:"Grade 3 Maths: Super Practice Quiz",emoji:"🔢",minutes:35,
blurb:"Numbers, adding and taking away, times tables, fractions, clocks, money, shapes and graphs, just like the papers from school. Take your time and have fun!",
topics:{
 num:{label:"Numbers and place value",tips:["Hundreds, tens and ones: 345 = 3 hundreds + 4 tens + 5 ones.","Odd numbers end in 1, 3, 5, 7, 9. Even numbers end in 0, 2, 4, 6, 8.","To round to the nearest 10, look at the ones. 5 or more? Go up!"],search:["place value hundreds tens ones grade 3","rounding to nearest 10 grade 3"]},
 ops:{label:"Adding and taking away",tips:["Add the ones first, then the tens, then the hundreds.","Check subtraction by adding the answer back.","Doubling means add the number to itself. Halving means share into 2 equal groups."],search:["addition and subtraction grade 3","doubling and halving grade 3"]},
 mult:{label:"Times tables and sharing",tips:["Learn the 2, 3, 4, 5 and 10 times tables.","An array has rows and columns: rows x columns gives the total.","Sharing equally is dividing."],search:["times tables 2 3 4 5 10 grade 3","multiplication arrays grade 3"]},
 frac:{label:"Fractions",tips:["The bottom number says how many equal parts. The top says how many are shaded.","1/2 is bigger than 1/4. More parts means smaller pieces!"],search:["fractions for grade 3","halves quarters thirds"]},
 time:{label:"Time and money",tips:["The short hand shows the hour, the long hand shows the minutes.","Long hand on 6 = half past. On 12 = o'clock. On 3 = quarter past. On 9 = quarter to.","Rands: R1 = 100c."],search:["telling time o'clock half past quarter past grade 3","South African money coins grade 3"]},
 meas:{label:"Measuring and shapes",tips:["Mass: grams (g) and kilograms (kg). 1 kg = 1000 g.","Length: centimetres (cm) and metres (m). 1 m = 100 cm.","Capacity: millilitres (ml) and litres (l)."],search:["mass length capacity grade 3","2D and 3D shapes grade 3"]},
 data:{label:"Patterns and graphs",tips:["Find the rule in a pattern: does it add, take away or repeat?","In a pictograph, count each picture. Check what each one stands for.","In tally marks, 4 lines and a strike through make 5."],search:["number patterns grade 3","pictographs and tally charts grade 3"]}
},
questions:[
 MC("num","What is the value of the 4 in 345?",["4","40","400","4 000"],1,"4 is in the tens place, so it is worth 40."),
 NUM("num","Write the number: 6 hundreds, 2 tens and 9 ones.",629,"600 + 20 + 9 = 629."),
 MC("num","Which is the number name for 408?",["Forty-eight","Four hundred and eight","Four hundred and eighty","Four thousand and eight"],1,"4 hundreds, 0 tens, 8 ones: four hundred and eight."),
 MC("num","Which number is the BIGGEST?",["398","389","893","839"],2,"893 has the most hundreds (8)."),
 MC("num","Round 67 to the nearest 10.",["60","65","70","80"],2,"The ones digit is 7, so go up to 70."),
 MC("num","Round 43 to the nearest 10.",["30","40","50","45"],1,"The ones digit is 3, so stay on 40."),
 MC("num","Which number is ODD?",["24","38","57","60"],2,"57 ends in 7, so it is odd."),
 MC("num","Look at the number line. The red dot is between 60 and 70, nearer to 70. To the nearest 10, the dot is on ...",["60","65","70","100"],2,"Nearer to 70, so round up to 70.",{svg:numline()}),
 NUM("num","What is 10 more than 275?",285,"Adding 10 changes the tens digit: 275 + 10 = 285."),
 NUM("num","What is 100 less than 540?",440,"The hundreds go down by 1: 540 - 100 = 440."),
 NUM("ops","24 + 35 = ?",59,"20 + 30 = 50, 4 + 5 = 9, so 59."),
 NUM("ops","148 + 125 = ?",273,"100 + 100 = 200, 40 + 20 = 60, 8 + 5 = 13. 200 + 60 + 13 = 273."),
 NUM("ops","86 - 42 = ?",44,"86 - 40 = 46, then 46 - 2 = 44."),
 NUM("ops","300 - 145 = ?",155,"145 + 155 = 300, so the answer is 155."),
 NUM("ops","Double 18.",36,"18 + 18 = 36."),
 NUM("ops","Half of 50.",25,"50 shared into 2 groups is 25 each."),
 NUM("ops","Sipho has 56 marbles. He wins 27 more. How many marbles does he have now?",83,"56 + 27 = 83.",{unit:"marbles"}),
 NUM("ops","There are 72 learners at the sports day. 38 go home early. How many are left?",34,"72 - 38 = 34.",{unit:"learners"}),
 NUM("mult","How many dots are in the array? (rows x columns)",15,"3 rows of 5 dots: 3 x 5 = 15.",{svg:arr(3,5)}),
 NUM("mult","How many dots are in the array?",12,"4 rows of 3 dots: 4 x 3 = 12.",{svg:arr(4,3)}),
 NUM("mult","5 x 6 = ?",30,"Count in fives: 5, 10, 15, 20, 25, 30."),
 NUM("mult","4 x 8 = ?",32,"4 x 8 is double 4 x 4 = 16, so 32."),
 NUM("mult","10 x 7 = ?",70,"Count in tens: 7 tens is 70."),
 NUM("mult","20 sweets are shared equally between 4 friends. How many sweets does each friend get?",5,"20 ÷ 4 = 5.",{unit:"sweets"}),
 NUM("mult","Each bag has 3 oranges. How many oranges are in 6 bags?",18,"6 x 3 = 18.",{unit:"oranges"}),
 MC("frac","What fraction of the bar is shaded?",["1/4","3/4","3/3","4/3"],1,"3 of the 4 equal parts are shaded: 3/4.",{svg:bar(4,3)}),
 MC("frac","What fraction of the circle is shaded green?",["1/2","1/3","2/3","3/2"],2,"2 of the 3 equal parts are shaded: 2/3.",{svg:pie(3,2)}),
 MC("frac","Which fraction is the biggest?",["1/2","1/4","1/8","1/3"],0,"The fewer the parts, the bigger each part. Halves are biggest here."),
 NUM("frac","What is half of 18?",9,"18 ÷ 2 = 9."),
 NUM("frac","What is a quarter (1/4) of 20?",5,"20 ÷ 4 = 5."),
 MC("time","What time does the clock show?",["3 o'clock","6 o'clock","half past 3","quarter past 3"],0,"The short hand is on 3 and the long hand is on 12: 3 o'clock.",{svg:clock(3,0)}),
 MC("time","What time does the clock show?",["Half past 7","Half past 6","7 o'clock","Quarter past 7"],0,"The short hand is just past 7 and the long hand is on 6: half past 7.",{svg:clock(7,30)}),
 MC("time","What time does the clock show?",["Quarter to 9","Quarter past 9","Quarter past 3","Half past 9"],1,"The long hand is on 3, so it is quarter past. The short hand is just past 9.",{svg:clock(9,15)}),
 NUM("time","How many minutes are in one hour?",60,"One hour is 60 minutes."),
 NUM("time","How many days are in one week?",7,"Monday to Sunday is 7 days."),
 NUM("time","Add up the coins: R5 + R2 + R2 + R1 = R ?",10,"5 + 2 + 2 + 1 = 10. (Ignore the 50c.)",{svg:mon(),unit:"rand"}),
 NUM("time","A pencil costs R3. How much do 4 pencils cost? (in rands)",12,"4 x R3 = R12.",{unit:"rand"}),
 NUM("time","You pay R20 for a book that costs R14. How much change do you get? (in rands)",6,"20 - 14 = 6.",{unit:"rand"}),
 NUM("meas","The scale is balanced. One side has a 2 kg block. How heavy is the other block?",2,"A balanced scale means both sides weigh the same.",{svg:scale(),unit:"kg"}),
 NUM("meas","How many centimetres are in 1 metre?",100,"1 m = 100 cm."),
 MC("meas","Which unit would you use to measure a bottle of cool drink?",["Kilograms","Metres","Litres","Hours"],2,"We measure liquid in litres (l) or millilitres (ml)."),
 MC("meas","Which shape is a triangle?",["Shape with 4 equal sides","Shape with 3 sides","Shape with no corners","Shape with 5 sides"],1,"A triangle has 3 sides and 3 corners.",{svg:function(){return shape('tri');}()}),
 MC("meas","Which shape has 4 equal sides and 4 square corners?",["Triangle","Circle","Square","Rectangle with 2 long and 2 short sides"],2,"A square has 4 equal sides.",{svg:shape('sq')}),
 MC("meas","This 3D object is a ...",["Sphere","Cube","Cone","Cylinder"],1,"A cube has 6 square faces.",{svg:cube()}),
 MC("data","Look at the pattern. What comes next?",["🔴","🔵","⭐","⬜"],0,"The pattern is red, blue, blue, repeating. After blue, blue comes red!",{svg:pat()}),
 NUM("data","What is the next number? 5; 10; 15; 20; ...",25,"The pattern counts in fives."),
 NUM("data","What is the next number? 40; 36; 32; 28; ...",24,"The pattern takes away 4 each time."),
 NUM("data","Look at the pictograph. How many learners chose bananas?",6,"Count the stars next to the banana: 6.",{svg:pict()}),
 MC("data","Which fruit is the favourite of the fewest learners?",["Apples","Bananas","Grapes","Oranges"],2,"Grapes only have 3 stars.",{svg:pict()}),
 NUM("data","Look at the tally chart. How many children chose dogs?",7,"One group of 5 plus 2 more strokes is 7.",{svg:tally()}),
 NUM("data","Look at the tally chart. How many MORE children chose dogs than cats?",3,"Dogs 7, cats 4. 7 - 4 = 3.",{svg:tally()})
]});})();

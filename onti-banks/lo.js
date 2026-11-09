(function(){
function hdr(w,h,inner){return '<svg viewBox="0 0 '+w+' '+h+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="diagram" font-family="sans-serif">'+inner+'</svg>';}
var plate=(function(){
  var cx=150,cy=115,r=105,secs=[[30,"#c0392b","A"],[60,"#f2b705","B"],[80,"#d9a066","C"],[110,"#2aa84a","D"],[80,"#8d6ac9","E"]],ang=-90,out="";
  function pt(a){var t=a*Math.PI/180;return [cx+r*Math.cos(t),cy+r*Math.sin(t)];}
  secs.forEach(function(x){var a1=ang,a2=ang+x[0],p1=pt(a1),p2=pt(a2),m=pt((a1+a2)/2);
    out+='<path d="M'+cx+','+cy+' L'+p1[0].toFixed(1)+','+p1[1].toFixed(1)+' A'+r+','+r+' 0 '+(x[0]>180?1:0)+' 1 '+p2[0].toFixed(1)+','+p2[1].toFixed(1)+' Z" fill="'+x[1]+'" stroke="#fff" stroke-width="2"/>';
    var lp=[cx+(r*0.62)*Math.cos((a1+a2)/2*Math.PI/180),cy+(r*0.62)*Math.sin((a1+a2)/2*Math.PI/180)];
    out+='<text x="'+lp[0].toFixed(0)+'" y="'+(lp[1]+5).toFixed(0)+'" text-anchor="middle" font-size="16" font-weight="700" fill="#fff">'+x[2]+'</text>';ang=a2;});
  return hdr(430,240,out+'<g font-size="12" fill="#2a2340"><text x="270" y="60">A = fats and sugar</text><text x="270" y="80">B = dairy (milk, cheese)</text><text x="270" y="100">C = protein (meat, eggs, beans)</text><text x="270" y="120">D = vegetables and fruit</text><text x="270" y="140">E = starch (bread, pap, rice)</text></g>');
})();
ONTI_REGISTER({key:"lo",subject:"Life Orientation",title:"Life Orientation: Health, Choices and Safety",emoji:"🌈",minutes:30,
blurb:"Healthy living, substance abuse, peer pressure and decision making, the environment and creativity. Based on your Term 4 paper.",
topics:{
 health:{label:"Healthy eating and lifestyle",tips:["A balanced diet has proteins, carbohydrates, vegetables, fruit, dairy and a little fat and sugar.","Protein foods: meat, fish, eggs, beans, nuts, milk.","Lifestyle choices that affect health: food, exercise, sleep, smoking, alcohol, stress."],search:["balanced diet food groups grade 7","healthy lifestyle choices for kids"]},
 subs:{label:"Substance abuse",tips:["Addictive: hard to stop using. Symptoms: signs that show something is wrong (physical and psychological).","Physical effects can include weight loss, red eyes, shaking. Psychological: anxiety, mood changes, depression.","Get help early from a trusted adult, a school counsellor, SANCA, Lifeline or Childline."],search:["substance abuse effects teenagers","SANCA help South Africa"]},
 infl:{label:"Influences and decision making",tips:["Intrapersonal influences come from inside you: personality, genetics, attitudes and beliefs.","Interpersonal influences come from other people: family, friends, home situation and community.","Say NO assertively: say it clearly, give a reason if you want, and walk away."],search:["peer pressure assertiveness for kids","how to make good decisions steps"]},
 dis:{label:"Diseases and prevention",tips:["Contagious / infectious diseases spread from person to person.","Wash hands, cover coughs, vaccinate and keep food and water clean.","Know the facts: you cannot get HIV from hugging, sharing a plate or mosquito bites."],search:["how germs spread handwashing for kids","HIV facts and myths for kids"]},
 env:{label:"Environment and creativity",tips:["Ecological = relating to the environment and its protection. Recycling turns waste into new products.","Crafts people / artisans make beautiful or practical things by hand.","Creative thinking is looking at a problem in many ways."],search:["recycling reduce reuse","creative thinking skills for kids"]},
 cult:{label:"Culture and diet",tips:["Culture and religion can influence what we eat: halal, kosher, vegetarian."],search:["religion and food halal kosher"]}
},
passages:{
 plate:{title:"A healthy plate",svg:plate},
 case:{title:"Case study: Sipho",text:"Sipho is 14. Since he started going out with older boys after school, he has become very thin and tired, his eyes are red and his hands shake. He used to love soccer but now skips practice. His marks have dropped and he shouts at his mom. Sipho's friends told him it is cool to try drugs. A teacher noticed the changes and told Sipho about the school counsellor and about SANCA."}
},
questions:[
 MATCH("env","Match the word to its meaning.",[["Contagious","Diseases spread from person to person"],["Ecological","Relating to the environment and its protection"],["Crafts people","Make beautiful or practical objects by hand"],["Creative thinking","Looking at a problem in many ways"]],"Words from your paper."),
 MC("subs","'Addictive' means...",["hard to stop using or doing","good for you","easy to stop","a type of food"],0,"Addictive substances make it very hard to stop."),
 MC("subs","In the case study, which is a PHYSICAL symptom?",["Red eyes and shaking hands","Shouting at mom","Skipping practice","Mark dropping"],0,"Physical symptoms affect the body.",{p:"case"}),
 MC("subs","In the case study, which is a PSYCHOLOGICAL or behaviour effect?",["Mood changes and shouting","Red eyes","Weight loss","Shaking hands"],0,"Mood and behaviour changes are psychological.",{p:"case"}),
 MC("subs","Which INTERPERSONAL factor (from other people) influenced Sipho?",["Friends who said it is cool to try drugs","His own personality","His genes","His height"],0,"Interpersonal = from other people such as friends.",{p:"case"}),
 MC("subs","What is the best advice for someone thinking about trying a dangerous drug?",["Say no, and talk to a trusted adult or counsellor","Try a little to see","Hide it from everyone","Do what friends say"],0,"Getting help early protects your health and your future."),
 MC("subs","Which is an organisation that can help with substance abuse?",["SANCA","Pick n Pay","SARS","Eskom"],0,"SANCA = South African National Council on Alcoholism and Drug Dependence."),
 MC("subs","Which person at SCHOOL could Sipho speak to first?",["The school counsellor or a trusted teacher","A stranger online","His dealer","Nobody"],0,"Speak to a trusted adult."),
 MC("infl","Personality, genetics, attitudes and beliefs are examples of ______ influences.",["intrapersonal","interpersonal","media","community"],0,"Intra = inside you."),
 MC("infl","Family, friends and home situation are ______ influences.",["interpersonal","intrapersonal","genetic","chemical"],0,"Inter = between people."),
 MC("infl","What is the best way to say NO to peer pressure?",["Say it clearly and calmly, then walk away","Say yes to be safe","Laugh and give in","Shout and fight"],0,"Assertive: firm but respectful."),
 ORDER("infl","Put the steps of making a good decision in order.",["Identify the problem","List your choices","Think about the results","Choose and act"],"Think before you act."),
 MC("health","Which foods are rich in PROTEIN?",["Meat, eggs and beans","Sweets and sugar","Butter and oil","Fizzy drinks"],0,"Meat and meat alternatives (eggs, beans, nuts, fish) provide protein."),
 MC("health","Which section of the plate shows the food group we should eat the LEAST of?",["A (fats and sugar)","B (dairy)","D (vegetables and fruit)","E (starch)"],0,"Fats and sugar are needed only in small amounts.",{svg:plate}),
 MC("health","Which section of the plate is the BIGGEST?",["A","C","D","E"],2,"Vegetables and fruit (D) should take the most space.",{svg:plate}),
 MC("health","A balanced diet means...",["eating a variety of foods in the right amounts","eating only meat","skipping breakfast","only eating sweets"],0,"Variety gives your body all the nutrients."),
 MC("health","Which of these is a healthy LIFESTYLE choice?",["Regular exercise and enough sleep","Smoking","Skipping meals","Watching screens all night"],0,"Exercise, sleep and good food keep you healthy."),
 MC("health","Which is the better drink for a growing body?",["Water","Energy drinks","Fizzy colddrink","Strong coffee"],0,"Water has no sugar or caffeine."),
 MC("dis","How can we stop germs spreading?",["Wash hands with soap and cover coughs","Share cups","Never wash","Touch your face often"],0,"Handwashing is one of the best ways to prevent infection."),
 MC("dis","Contagious diseases are those that...",["spread from person to person","come from rocks","only affect animals","can never be treated"],0,"Contagious/infectious diseases spread."),
 TF("dis","You can get HIV by hugging or sharing a plate with someone who has HIV.",false,"HIV is not spread by hugging, shaking hands or sharing food."),
 MC("env","Recycling means...",["turning waste into new products","burning rubbish","burying rubbish","throwing it in rivers"],0,"Recycling saves resources and reduces pollution."),
 MC("env","Which is an example of REDUCING waste?",["Taking your own shopping bag","Throwing a bag away","Buying lots of plastic","Burning paper"],0,"Reduce, reuse, recycle."),
 MC("cult","Cultural beliefs can influence what we eat. For example...",["Many Muslim households eat halal food","Everyone eats the same","Food has no link to culture","Only schools decide"],0,"Halal, kosher and vegetarian diets are examples."),
 MC("health","Which statement about sleep is TRUE for a Grade 7 learner?",["You need about 9 to 11 hours of sleep to grow and learn well","Sleep is a waste of time","Two hours is enough","Sleeping makes you forget"],0,"Children and young teens need plenty of sleep to concentrate and remember.")
]});})();

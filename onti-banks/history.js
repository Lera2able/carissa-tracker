(function(){
function hdr(w,h,inner){return '<svg viewBox="0 0 '+w+' '+h+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="diagram" font-family="sans-serif">'+inner+'</svg>';}
var tl=hdr(440,130,'<line x1="20" y1="60" x2="420" y2="60" stroke="#2a2340" stroke-width="4"/><g fill="#6d3fc0"><circle cx="50" cy="60" r="8"/><circle cx="160" cy="60" r="8"/><circle cx="270" cy="60" r="8"/><circle cx="380" cy="60" r="8"/></g><g font-size="14" font-weight="700" text-anchor="middle"><text x="50" y="40">1652</text><text x="160" y="40">1795</text><text x="270" y="40">1834</text><text x="380" y="40">1836</text></g><g font-size="12" text-anchor="middle" fill="#2a2340"><text x="50" y="90">A</text><text x="160" y="90">B</text><text x="270" y="90">C</text><text x="380" y="90">D</text></g><text x="220" y="118" text-anchor="middle" font-size="11" fill="#6f6888">Timeline of the Cape (events A to D are explained in the questions)</text>');
ONTI_REGISTER({key:"history",subject:"Social Sciences: History",title:"History: The Cape, Slavery and the Great Trek",emoji:"🏰",minutes:30,
blurb:"Early people of the Cape, the Dutch (VOC), slavery, the British and the Boers' Great Trek. Based on your past November papers.",
topics:{
 early:{label:"Early people: San and Khoikhoi",tips:["San were hunter-gatherers who painted on rocks. Khoikhoi were pastoralists who kept cattle and sheep.","Bleek and Lloyd wrote down /Xam San stories in the 1870s, so we know much about San beliefs."],search:["San and Khoikhoi history South Africa","Bleek and Lloyd /Xam stories"]},
 voc:{label:"The VOC and the Cape",tips:["The VOC (Dutch East India Company) sent Jan van Riebeeck to the Cape in 1652 to set up a refreshment station.","Sailors got scurvy (lack of vitamin C), so fresh fruit and vegetables were grown.","The Dutch built a fort for protection."],search:["Jan van Riebeeck 1652 refreshment station","scurvy sailors"]},
 slav:{label:"Slavery at the Cape",tips:["Slaves came from Indonesia, India, Madagascar and East Africa.","Slave legacy today: Cape Malay food, mosques, Afrikaans language and music.","The British abolished slavery in 1834.","Inboekselinge: children 'booked' to farmers, which was like slavery."],search:["slavery at the Cape history grade 7","inboekselinge system"]},
 brit:{label:"British rule and the Great Trek",tips:["The British took the Cape in 1795 and again in 1806.","The Boers (Voortrekkers) left the Cape Colony in the 1830s in the Great Trek. Reasons: British laws, the end of slavery, English language.","The frontier is the area where two groups met."],search:["Great Trek reasons grade 7","British take over the Cape"]},
 words:{label:"History words",tips:["Colonialism: gaining political control of another country. Republic: a country with no king, ruled by elected leaders."],search:["history key words colonialism republic frontier"]}
},
passages:{
 timeline:{title:"Timeline",svg:tl},
 src1:{title:"Source A: Written by a visitor at the Cape",text:"\"The slaves are made to work from sunrise to sunset. They live in the Slave Lodge, a large building in Cape Town. Many of them were brought from far away, from Indonesia, India and Madagascar, and they cannot return home.\""},
 src2:{title:"Source B: About the inboekselinge system",text:"After the end of slavery, farmers could ask the government to 'book in' (inboek) San and Khoi children who had been captured. The children had to work on the farm without pay until they were grown up. Many farmers treated them like slaves."}
},
questions:[
 MC("early","The San were...",["hunter-gatherers","pastoralists","sailors","British soldiers"],0,"San moved around hunting animals and gathering plants."),
 MC("early","The Khoikhoi are called pastoralists because they...",["kept cattle and sheep","only hunted","built ships","painted caves"],0,"Pastoralists look after herds of animals."),
 MC("early","San rock paintings tell us about...",["their beliefs and daily life","the Dutch ships","British laws","the Great Trek"],0,"Rock art shows animals, people and spiritual ideas."),
 MC("early","What did Wilhelm Bleek and Lucy Lloyd do?",["Wrote down /Xam San stories and language","Started the VOC","Led the Great Trek","Abolished slavery"],0,"They recorded /Xam stories from San people in the 1870s."),
 MC("voc","VOC stands for the...",["Dutch East India Company","British Army","Voortrekker Council","Cape Colony Office"],0,"Vereenigde Oostindische Compagnie."),
 NUM("voc","In which year did Jan van Riebeeck arrive at the Cape?",1652,"1652, to set up a refreshment station."),
 MC("voc","Why did the VOC want a refreshment station at the Cape?",["To supply passing ships with fresh food and water","To start a war","To mine gold","To build a university"],0,"It was halfway between the Netherlands and the East."),
 TX("voc","Name the disease sailors got from not eating fresh fruit and vegetables. (one word)",["scurvy"],"Scurvy is caused by a lack of vitamin C."),
 MC("voc","Give ONE good reason why the VOC chose Table Mountain / Table Bay.",["Fresh water and a sheltered bay","A big gold mine","A large city already there","Snow for drinking"],0,"The streams gave fresh water and the bay protected ships."),
 TX("voc","What do we call the strong building the Dutch built for protection? (one word: f...)",["fort","castle"],"The Castle of Good Hope is a fort."),
 MC("slav","Look at Source A. Where did the slaves live?",["In farm houses","In the Slave Lodge","On ships","In castles"],1,"Source A says they lived in the Slave Lodge.",{p:"src1"}),
 MC("slav","Source A says slaves came from far away. Which country is mentioned?",["Indonesia","Egypt","Brazil","Canada"],0,"Indonesia, India and Madagascar are named.",{p:"src1"}),
 MC("slav","Name something slaves left behind that we can still see today.",["Cape Malay food and mosques","Skyscrapers","Computers","Trains"],0,"Food, music, language and religion are part of the legacy."),
 NUM("slav","In which year did the British free the slaves (abolition)?",1834,"Slavery was abolished in 1834.",{tol:0}),
 MC("slav","Source B: What was one reason the inboekselinge system seemed like slavery?",["Children worked without pay","They were paid very well","They went to school","They owned the farms"],0,"Children were forced to work without payment.",{p:"src2"}),
 MC("slav","Source B: Who were the 'inboekselinge'?",["San and Khoi children booked to farmers","British soldiers","Dutch officials","Ship captains"],0,"They were children booked to work for farmers.",{p:"src2"}),
 NUM("brit","In which year did the British first take over the Cape?",1795,"The first British occupation was in 1795 (permanently in 1806).",{tol:0}),
 TX("brit","What was the migration of the Boers away from the Cape Colony called? (two words: Great ...)",["great trek","the great trek"],"The Great Trek happened in the 1830s and 1840s."),
 MC("brit","Give ONE reason why the Boers left the Cape Colony.",["They did not like British rule and the end of slavery","They wanted to visit Europe","The Cape ran out of water","They were forced to by the San"],0,"Boers disliked British laws, English, and the freeing of slaves."),
 ORDER("brit","Put the events in the correct order (earliest first).",["Dutch settle at the Cape (1652)","British take the Cape (1795)","Slavery is abolished (1834)","The Great Trek begins (1836)"],"Use the timeline: 1652, 1795, 1834, 1836.",{p:"timeline"}),
 MC("brit","In the timeline, which event is D (1836)?",["The Great Trek begins","Slavery is abolished","Dutch arrive","British arrive"],0,"1836 is the start of the Great Trek.",{p:"timeline"}),
 MATCH("words","Match the word to its meaning.",[["Republic","A country that is independent and not ruled by a king"],["Frontier","The area where two different groups meet"],["Mosque","Muslim place of worship"],["Colonialism","Gaining political control over another country"]],"Key words from your paper."),
 MATCH("words","Match the word to its meaning.",[["Enlist","Join the army"],["Paroled","Set free under strict conditions"],["Military","Relating to the army"],["Rock painting","Pictures painted on rocks by the San"]],"More key words."),
 MC("words","Which person set up the refreshment station for the Dutch?",["Jan van Riebeeck","Paul Kruger","Cecil Rhodes","Nelson Mandela"],0,"Commander Jan van Riebeeck arrived in 1652.")
]});})();

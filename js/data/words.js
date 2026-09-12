// Word, sentence and paragraph banks used to build exercises.
// Everything is kid-friendly and deliberately simple. Sentences are filtered
// automatically by which keys the learner knows, so variety here matters most
// for text made of common letters.
window.KQ = window.KQ || {};

KQ.WORDS = `
a about add adds ads after again air alas all also am an and animal ant any apple are arm art as ask asks at ate away
baby back bad bag bake ball band bark barn bat bath be beach bean bear bed bee bell belt bend best big bike bird bite black blue boat body bone book boot both box boy bread brick bring brown brush bug bump bus but buy by
cake call calm camp can cap car card care cart cat chair chalk cheek chest chick chin chip city clap class clean clip clock cloud club coat cold come cook cool corn cow crab crash cry cup cut
dad dads dance dark dash day deal deep deer den desk did dig dill dime dirt dish do dog doll door dot down draw dream dress drink drip drop drum dry duck dug dull dust
each ear earth easy eat edge egg eight elf elk else end even eye
face fad fads fair fall falls fan far farm fast fat feed feel feet fell few field fig fill film find fine fire fish fist five fix flag flash flask flasks flat flea flip float flute fly foam fog food foot for fork fox free fresh frog from front fruit full fun fur
gal game gap gas gash gate get gift girl give glad glass glide glue go goal goat gold golf good got grab grade grape grass gray great green grin grow gum
had hag hail hair half hall ham hand hard has hash hat have hay he head heal hear heat heel help hen her here hid hide high hike hill him hip his hit hold hole home hop hope horse hot house how hug hum hut
ice idea if ill in ink into is it
jab jade jail jam jar jaw jeep jet jig job jog join joke joy judge jug juice jump just
keep kept key kick kid kids kind king kiss kit kite knee
lad lads lag lake lamb lamp land lap large lash lass last late lead leaf leak leg lend less let lid life lift light like lime line lion lip list lit little live lock log long look lot loud love low luck lunch
mad made make man map mask mat may me meal meet melt men mess milk mine miss mist mix mom moon mop more most moth mud mug mule my
nail name nap neck nest net new next nice night nine no nod nose not note now nut
oak oat odd of off oil old on one open or our out owl
pack pad page paid pail pan park part pass pat path paw pea peel pen pet pick pie pig pile pin pink pit plan plant plate play plug pod pond pool pop pot pull pup puppy push put
quack queen quick quiet quilt quit quiz
race rag rain rake ran rat read red rest ride ring rip ripe road rock rod roll roof room rope rose rug rule ruler run rush
sad safe sag said sail salad salads salt sand sash sass sat saw say scale sea seal seat see seed seek sell send set shall shape shark she shed sheep shell shine ship shoe shop shut sick side silk sing sink sip sit six size skate ski skip sky sled sleep slid slide slip slow small smell smile snail snow so sock soft some song soon soup speed spell spin spot star stay step stick still stop store sun swim
tag tail take tale talk tall tank tap tea teeth tell ten tent test than that the them then they thick thin this three tie tiger time tin tip to toad toe told top toy tray tree trip truck try tub tug turn two
under up us use
van vase vest vet vine
wag wait wake walk want warm was wash water wave wax way we web well went wet what when white who why wide wig wild will win wind wing wish with wood wow
yak yam yard yarn yell yes yet you your yum
zap zip zoo zoom
`.trim().split(/\s+/);

// Common English bigrams and trigrams, most frequent first. Drills pick the
// ones the learner can already type.
KQ.BIGRAMS = "th he in er an re on at en nd ti es or te of ed is it al ar st to nt ng se ha as ou io le ve co me de hi ri ro ic ne ea ra ce li ch ll be ma si om ur ca el ta la ns di fo ho pe ec pr no ct us ac ot il tr ly nc et ut ss so rs un lo wa ge ie wh ee wi em ad ol rt ai sa fe sh ke ke ck lt ag ap ay am ip ig id og ud up ug ub".split(" ");
KQ.TRIGRAMS = "the and ing ion tio ent ati for her ter hat tha ere ate his con res ver all ons nce men ith ted ers pro thi wit are ess not ive was ect rea com eve per int est sta cti ica ist ear ain one our itu ill ave nde ide".split(" ");

KQ.SENTENCES = [
  // Home row plus a few early letters (short, simple, lowercase-friendly)
  "she has a desk", "he sells shells", "dad likes his salad", "a seal is sleek", "she hides the jade", "he had a fig",
  "kids like dill", "sid is sad", "dad fills a dish", "a kid slides", "lili likes salads", "fish like seeds", "seals seek fish",
  "jill is a kid", "i like jade", "dad adds dill", "kids feel safe", "i see a field", "ask a kid", "a leaf falls", "dad sells kale",
  "sid feels ill", "a sled slides", "elsa likes fish", "his leg heals", "sid is glad", "she said hi", "add a slide", "he feels ill", "jill has a red sled",
  "sue likes juice", "he fed a huge duck", "she hugs her dad", "a deer sleeps here", "ask sue if she is sure",
  "jake rides far", "dads rake leaves", "the kids are at the lake", "they had a great day", "a tiger eats steak",
  "the sky is dark", "yes that is sad", "her sister likes tea", "the tree is tall", "they said he is late",
  "the tests are easy", "let the sea shells rest", "the rug is red", "hush the little dog", "i see three red kites",
  "the deer hid at the hill", "her dad has a jeep", "the fish is fresh", "he likes his tea hot", "she is right here",
  "the gate is shut", "they will skate at the lake", "she has a yellow hat", "we walk to the store", "the dog ate all the food",
  "who is at the door", "look at the yellow sky", "the owl sleeps all day", "he will grow tall like his dad",
  "we like to draw stars", "the queen likes apples", "put the pie up high", "the puppy digs a hole",
  // General sentences
  "The cat sat on the mat.", "I like to play in the park.", "The sun is hot today.", "My dog can run fast.",
  "We eat cake at the party.", "A frog can jump high.", "The red ball is big.", "She has a blue hat.",
  "He can ride a bike.", "Fish swim in the lake.", "Birds sing in the trees.", "I see a little bug.",
  "The moon is out at night.", "Milk is good for you.", "The kids play a fun game.", "My mom made hot soup.",
  "Dad has a green truck.", "The duck likes the pond.", "Let us go to the zoo.", "The bee is on the rose.",
  "We can build a snow fort.", "Pigs like to roll in the mud.", "I read a book about kings.", "Look at the big black bear!",
  "Can you help me find my key?", "Wow, that kite flies so high!", "Do you want a slice of pie?", "\"Let's go!\" said Sam.",
  "It's time for lunch.", "Don't drop the glass jar.", "The fox hid in the tall grass.", "Six frogs sat on a log.",
  "Ten ants ate the jam.", "The lion has a long tail.", "Zip up your coat, it is cold.", "A tiny seed can grow into a tree.",
  "The clock says it is nine.", "Quick, the bus is here!", "Jake and Zoe love to swim.", "Max has five toy cars.",
  "Please pass the salt.", "The queen has a gold ring.", "Rain fell on the roof all night.", "We had fun at the farm.",
  "The baby has a soft blanket.", "Bake the bread, then eat it.", "My best friend is very kind.", "The ship sails on the sea.",
  "Is that your yellow van?", "What's your favorite color?", "Where did you put the red pen?", "Wait for me, I'm coming too!",
  "That's the best joke I've heard!", "The bear sleeps all winter long.", "We planted seeds in the garden.",
  "My cat likes to nap in the sun.", "The train goes over the bridge.", "Grandpa tells the best stories.",
  "The snow is deep and white.", "Our teacher reads to us every day.", "The little goat ate my hat.",
  "I can hop on one foot.", "The bus stops at the corner.", "We made a card for Mom.", "The pond is full of frogs.",
  "A crab walks sideways on the sand.", "The wind blew my kite away.", "Turtles are slow but steady.",
  "I lost my shoe under the bed.", "The stars come out at night.", "We had pizza for dinner.", "My sister can do a cartwheel.",
  "The dog dug a hole in the yard.", "A rainbow has seven colors.", "The kitten chased the ball of yarn.",
  "We built a sand castle at the beach.", "The bell rings when class is over.", "My uncle drives a big red truck.",
  "The cow gives us milk.", "I like to jump in puddles.", "The ants march in a line.", "The wolf howls at the moon.",
  "Her boots are muddy and wet.", "The apples are ripe and sweet.", "The clown has a red nose.", "We fed the ducks at the pond.",
  "The owl hoots in the dark.", "Ice cream melts in the sun.", "The frog sat on a lily pad.", "Bees make honey in the hive.",
  "The mouse hid under the chair.", "My brother lost a tooth today.", "The horse ran across the field.",
  "We saw a whale from the boat.", "The rain made the grass green.", "A spider spins a web.", "The pirate found a chest of gold.",
  "My robot can walk and talk.", "The bunny hops through the garden.", "Dinosaurs lived long ago.",
  "The soup is too hot to eat.", "I can count to one hundred.", "The kite is stuck in the tree.", "We roasted marshmallows by the fire.",
  "The penguin slid on the ice.", "Please close the door softly.", "The monkey swings from tree to tree.",
  "Our tent is blue and green.", "A camel can walk for days.", "My shoes are too small now.", "The band played a loud song.",
  "The turtle hid in its shell.", "We picked berries in the woods.", "The rocket zoomed into space.",
  "The baby birds want more food.", "I made a hat out of paper.", "The leaves fall in autumn.", "The dragon breathed fire.",
  "A duck has webbed feet.", "The clouds look like sheep.", "We played tag until dark.", "The fox has a bushy tail.",
  "My pencil broke in half.", "The snake slid under a rock.", "The sun sets in the west.", "Look, a shooting star!",
  "Sharks have lots of teeth.", "Can we go to the park?", "Who ate the last cookie?", "Why is the sky blue?",
  "When does the show start?", "Is it time to go home?", "Did you feed the fish?", "Where is my other sock?",
  "Hooray, we won the game!", "Watch out for the puddle!", "Yum, this pie is great!", "Oh no, I spilled the milk!",
  "Stop, the light is red!", "Happy birthday to you!", "I can't wait for summer.", "We're going to the beach.",
  "It's raining cats and dogs.", "She's my best friend.", "Don't touch the hot stove.", "You're doing a great job.",
  "The dog's tail wags fast.", "That's my mom's car.", "Let's build a fort.", "I'll race you to the swings.",
  // Numbers
  "I have 3 cats and 2 dogs.", "There are 7 days in a week.", "Add 4 and 5 to get 9.", "My sister is 10 years old.",
  "We saw 12 ducks and 1 swan.", "Turn left, then go 2 blocks.", "I am 8 years old today.", "The bus leaves at 4.",
  "We need 6 eggs for the cake.", "There are 24 kids in my class.", "My house is number 15.", "Count to 20 with me.",
  "A spider has 8 legs.", "I found 5 shells on the beach.", "The store opens at 9.", "We walked 3 miles today.",
  "It is 30 degrees outside.", "My dog is 2 years old.", "There are 12 months in a year.", "Take 10 big steps.",
  "One box holds 6 crayons.", "He scored 3 goals in the game.", "Our tree is 40 feet tall.", "I read 5 books this month.",
];

KQ.PARAGRAPHS = [
  "Once upon a time there was a small green frog. He lived on a lily pad in the middle of a quiet pond. Every morning he hopped from pad to pad, looking for tasty bugs to eat. At night he sang loud songs to the moon.",
  "Mia has a new red bike. It has a shiny bell and a little basket on the front. She rides it to the park every day after school. Her dog Max runs beside her, wagging his tail the whole way.",
  "The sky was full of stars. Sam and his dad lay on a blanket in the yard and looked up. They found the Big Dipper and a bright red planet. Then a shooting star zoomed by, and Sam made a wish.",
  "Penguins are birds, but they cannot fly. They live where it is very cold and use their wings to swim. A penguin can dive deep under the ice to catch fish. On land they waddle, slide on their bellies, and huddle together to stay warm.",
  "It was the day of the big race. Ten kids lined up at the start with their go-karts. When the flag dropped, they zoomed off down the hill. Zoe took the lead on the last turn and crossed the finish line first!",
  "Grandma's kitchen always smells like cookies. She lets me stir the batter and add the chocolate chips. When the timer beeps, we pull out the tray and wait for them to cool. Then we eat two each with a cold glass of milk.",
  "Leo found a tiny turtle by the creek. Its shell was green with yellow spots. He watched it crawl slowly over the rocks and slip into the water. Then he waved goodbye and walked home with muddy shoes.",
  "The wind was perfect for flying kites. Ava let out the string bit by bit until her kite was just a dot in the sky. A gust pulled hard and she held on tight. When the wind died down, the kite floated gently back to the grass.",
  "Every Saturday we go to the farmers market. There are piles of red apples, baskets of corn, and jars of golden honey. I always pick out a giant pumpkin in the fall. Dad carries it to the car because it is too heavy for me.",
  "Bats sleep during the day and fly at night. They hang upside down in caves and hollow trees. To find their way in the dark, they make tiny squeaks and listen for the echoes. One bat can eat hundreds of bugs in a single night.",
  "Ben built a robot out of boxes and tape. It had bottle caps for eyes and a paper cup for a nose. He painted it silver and gave it the name Bolt. Bolt could not walk, but he was the best robot in the whole house.",
  "The snow fell all night long. In the morning the yard was white and quiet. We put on our boots and mittens and ran outside. First we made snow angels, then we built a snowman with a carrot nose and a red scarf.",
  "A caterpillar eats and eats until it is fat. Then it makes a cozy case around itself and goes to sleep. Inside, something amazing happens. When the case opens, out comes a butterfly with bright new wings.",
  "Our class has a pet hamster named Peanut. He runs on his wheel at night and sleeps in a pile of fluff all day. On Fridays someone gets to take him home. This week it is my turn, and I can hardly wait.",
  "The old lighthouse stood on the rocky point. Every night its light swept across the dark sea. Ships far away saw the beam and knew where the rocks were. The keeper climbed the long stairs each evening to light the lamp.",
  "Emma planted a bean in a paper cup. She put it by the window and gave it a little water each day. After a week a tiny green shoot poked out of the dirt. By the end of the month the plant was taller than her ruler.",
  "The circus came to town on a warm summer day. There were elephants, jugglers, and a man on stilts. A clown with giant shoes gave me a balloon shaped like a dog. My favorite part was the acrobat who flew through the air.",
  "Ducks are great swimmers. Their feathers are coated in oil, so the water rolls right off. Their wide webbed feet work like paddles. Baby ducks can swim the very first day they hatch, following their mother in a line.",
  "Jack lost his tooth at lunch. It fell out while he was biting an apple. He wrapped it in a napkin and kept it safe all day. That night he put it under his pillow and dreamed about what he would find in the morning.",
  "The library is my favorite place. It is quiet and cool, and it smells like paper. I can pick any book I want and sit in the big soft chair by the window. Last week I read three books about dragons in one afternoon.",
  "A tiny mouse lived in the wall of a big house. Every night she crept out to look for crumbs. One night she found a whole cookie under the table. It took her until sunrise to drag it home, but it was worth it.",
];

// ============================================================
// WRETVISION — CENTRAL REVIEW DATA
// ============================================================
// HOW TO ADD A REVIEW:
// Paste a new object at the TOP of the REVIEWS array.
// category: "movie" | "tv" | "game"
// genres:   array of genre slugs e.g. ["horror", "cult"]
// score:    number 1–10
// ============================================================

const REVIEWS = [
    {
      id: 4,
      category: "movie",
      title: "Undertone",
      year: 2025,
      director: "Ian Tuason",
      runtime: "94 min",
      rating: "R",
      genres: ["horror", "cult"],
      score: 2,
      featured: false,
      excerpt: "Undertone is a sloppy movie that has decent cinematography but fails at everything else.",
      body: [
        `I went into Undertone expecting a slow burn. That usually means patience pays off eventually, tension builds, something clicks, and you walk away thinking it was worth it. Here, it mostly just drags.

The movie follows Evy Babic, played by Nina Kiri, who runs a paranormal podcast with her friend Justin (Adam DiMarco). She moves back home to take care of her dying mother, which on paper sounds like emotional setup, but in practice it mostly feels like she's just there, stuck in the same loop as the movie itself.

The core gimmick is actually not bad. They receive these audio recordings from a couple, Jessa and Mike, where weird stuff is happening. Sounds in the recordings start reflecting in Evy's real life. Sink turns on in the audio? Suddenly it happens to her. That kind of mirrored reality thing could've been genuinely creepy. But instead of building on that idea, the movie just repeats it.

Then you've got the reversed audio angle, which leans into that whole "play it backwards and hear something sinister" concept. They even go into children's songs having hidden messages, which feels like something we've all already seen done before but better.`,

        `And then the film introduces the demon: not Pazuzu from The Exorcist, but Abyzou. This is where it gets really fucking pathetic. It's like the filmmakers wanted the name recognition of Pazuzu without actually using him. They created their own Pazuzu lite but forgot to make it actually scary or meaningful. Abyzou is tied to miscarriages and targeting mothers and children, so yeah, there is a thematic link with Evy and her situation, but the movie doesn't really dig into it. It just name drops it and expects that to carry the horror.

And that's kind of the recurring issue here: ideas without payoff.

Visually, I'll give it credit. The cinematography is clean. You can actually see what's happening, which already puts it above half the modern horror movies that hide everything in darkness. Some of the lighting choices are clearly intentional, and those moments do work.

Also, the runtime, about 90 minutes, is doing this movie a favor. Any longer, and this would've been a real struggle.

But even within that runtime, it feels stretched thin. A slow burn still needs something simmering underneath, character depth, tension, escalation. Undertone just idles in place.`,

        `Let me be blunt: this movie is a fucking audio experiment masquerading as a film. Critics are creaming themselves over the sound design. Yeah, great, you made some spooky noises. I can get that from a free horror podcast on YouTube without sitting through 90 minutes of Nina Kiri looking concerned in different rooms of her house.

The gimmick of having Evy as the only character we actually see while everyone else is just voices? Lazy. Some pretentious critics defend this as artistic restraint. Bullshit. This isn't artistic restraint, it's a budget constraint dressed up as avant-garde filmmaking.

What's really frustrating is that Undertone had all the ingredients to be something special. The premise of a paranormal podcaster being haunted by recordings that mirror her reality is genuinely clever. But they squandered it. After masterfully plotting the slow build of dread, the ending feels rushed and derivative of better horror movies. It's as if the filmmakers realized they needed to deliver some conventional horror beats, couldn't figure out how to make them feel earned, and just threw jump scares at the wall.

Undertone wants to have it both ways, artistic slow burn and conventional supernatural thriller, and succeeds at neither. There's a difference between leaving viewers with questions and leaving them with nothing. This is the latter. Save your money and listen to a creepy podcast instead. At least those are free.`
      ],
      verdict: "A podcast stretched into a movie that gives you cinematic blue balls."
    },
    {
      id: 1,
      category: "movie",
      title: "Dark City",
      year: 1998,
      director: "Alex Proyas",
      runtime: "100 min",
      rating: "R",
      genres: ["sci-fi", "noir"],
      score: 8,
      featured: true,
      excerpt: "Before The Matrix changed everything, there was Dark City, a neo-noir fever dream about memory, identity, and a city that reshapes itself at midnight. Nobody talks about this film enough and that is a crime against cinema.",
      body: [
        `Here is the setup: a man wakes up in a bathtub with no memory, a dead woman in the room, and no idea who he is or how he got there. Meanwhile, somewhere above the city, a group of pale bald men in long coats are reshaping the streets while everyone sleeps. Buildings grow. Alleyways vanish. Memories get swapped between people like trading cards. Dark City arrived in 1998, a full year before The Matrix, made on a fraction of the budget, and somehow pulled off something arguably more interesting. Where The Matrix asked what if reality is a simulation, Dark City asked something harder: what if everything you think you are was built by someone else, and does it even matter?

That second question is the one that sticks with you after the credits roll. And it's a better question.

Rufus Sewell plays John Murdoch, and his hollow-eyed bewilderment carries every single frame of this film. He's not a chosen one. He's not cool. He's terrified and confused and you feel that completely. The disorientation isn't just his, it bleeds into the audience. You piece things together alongside him, which is exactly how a mystery like this should work.`,

        `The production design is the real star of Dark City and I don't say that lightly. It is an absolute masterpiece of atmosphere. All gothic expressionism and art deco nightmare, like if Fritz Lang had a fever dream about 1940s Chicago and nobody told him to stop. Every shot looks like a painting someone forgot to explain. The city feels genuinely alive and genuinely wrong in ways that are hard to articulate but impossible to ignore.

The Strangers, the alien antagonists, are genuinely unsettling in a way that modern CGI villains almost never manage. They move wrong. They speak wrong. They feel like something born from a completely different kind of nightmare than Hollywood usually deals in, and the practical effects work that went into them holds up completely even now.

Kiefer Sutherland is doing his best Peter Lorre impression throughout the film and I have seen people call that distracting. Those people are wrong. It's perfect. It fits the film's operatic, slightly-too-much-of-everything tone exactly. Jennifer Connelly is underused, which is the one genuine criticism I'd level at the film, but even in limited screen time she brings a sadness to her scenes that grounds the whole thing emotionally.

Roger Ebert named Dark City his favourite film of 1998. I completely get it. There's a melancholy running through this film that The Matrix's slicker, more confident blockbuster machinery never quite reached. The Matrix is about liberation. Dark City is about loss. About the possibility that who you are might be entirely constructed, and the heartbreaking realisation that it might not matter, because the feelings were still real.`,

        `Now the important part: there are two versions of this film and you need to watch the right one.

The theatrical cut opens with a voiceover narration that spoils the entire central mystery in the first sixty seconds. Sixty seconds. Someone at the studio panicked, decided audiences couldn't handle ambiguity, and made a decision that should haunt them forever. That version of the film is still good, but it's a shadow of what it's supposed to be.

The Director's Cut removes the narration completely and restores the film to what Alex Proyas actually intended. No handholding. No explanation. Just a man in a bathtub and a city full of wrong things and a mystery you have to earn. That's the version. The only version. If you've only seen the theatrical cut and thought it was fine, watch the Director's Cut and discover you've been watching a lesser film this whole time.

Dark City is the kind of film that shouldn't have been forgotten. It came out at the wrong time, got overshadowed by bigger releases, and never found the mainstream audience it deserved. The people who did find it tend to hold it close. If you haven't seen it yet, you're about to join that group. Watch it twice. The second time hits differently once you know what everything means.`
      ],
      verdict: "A forgotten masterpiece. Watch the Director's Cut. Watch it twice."
    },
    {
      id: 2,
      category: "movie",
      title: "Mandy",
      year: 2018,
      director: "Panos Cosmatos",
      runtime: "121 min",
      rating: "NR",
      genres: ["horror", "cult"],
      score: 7,
      featured: false,
      excerpt: "Nicolas Cage at his most unhinged, in a psychedelic revenge nightmare drenched in eye candy. Bizarre, beautiful, and absolutely not for everyone.",
      body: [
        `There is a scene in Mandy where Nicolas Cage, drenched in blood, drinks an entire bottle of vodka in a bathroom while making sounds that no human being has ever made before. Not in film. Not in life. Sounds that exist somewhere between grief and fury and complete psychological collapse. That scene is either the greatest piece of acting committed to celluloid or an elaborate performance art prank that somehow got a $6 million budget and a theatrical release. I have watched it multiple times and I genuinely cannot tell which one it is. I think that ambiguity is the entire point of Nicolas Cage as a concept.

Mandy is directed by Panos Cosmatos, son of the director of Rambo: First Blood Part II, which is a completely insane piece of trivia for a film this strange and personal. Cosmatos makes films that operate like waking nightmares, slow and hallucinogenic and absolutely soaked in dread and colour. This is only his second feature and it announces him as someone doing something genuinely different with the horror genre.`,

        `The film splits cleanly into two halves and they feel like different movies that happen to share a main character.

The first hour is almost a pastoral love story. Red Miller, played by Cage, lives in a remote cabin in the forests of the Pacific Northwest with Mandy, played by Andrea Riseborough. They are quietly, deeply in love. The film takes its time with this. Long, amber-lit shots of trees. Conversations that feel genuinely tender. Jóhann Jóhannsson's score, one of the final scores he completed before his death, wraps around everything like something between a lullaby and a funeral. It's gorgeous. It's peaceful. It makes you feel safe.

Then a cult shows up. Led by Jeremiah Sand, a failed folk musician played by Linus Roache with terrifying conviction, they destroy everything. And the film transforms completely into something that sounds insane when you describe it out loud. Cage forges a battle axe in a barn. There is a chainsaw duel. There are demons summoned from a different dimension. There is face paint and heavy metal and violence that is simultaneously horrifying and almost cartoonishly over the top.

That tonal shift is either the film's greatest achievement or its biggest problem depending entirely on your headspace when you sit down to watch it.`,

        `Here's where I land: Mandy is undeniably eye candy. Cosmatos has a genuine visual gift and this film drips with it. Every frame looks like an album cover for a band that doesn't exist yet. The colour grading alone, all blood reds and deep purples and sickly greens, is some of the most distinctive work of the decade. The practical effects are wild and committed. The chainsaw duel is exactly as insane as it sounds and somehow more.

But bizarre is the right word for it, and I mean that as both praise and caveat. The narrative logic is dreamlike to the point of being deliberately incoherent. Character motivations exist more as vibes than actual reasoning. The pacing in the second half is relentless in a way that can tip from exhilarating into genuinely exhausting. This is a film you need to be in the right mood for. Put it on at the wrong moment and it'll feel like homework.

And then there's Cage himself. He is not acting here. That is not what this is. He is summoning something from a dimension where the normal rules of screen performance don't apply, and the result oscillates between transcendent and ridiculous, sometimes within the same minute. If that sentence sounds like your idea of a good evening, Mandy will deliver everything you want and more. If you are expecting a conventional horror film with a clear narrative structure and a satisfying resolution, you are in completely the wrong cinema and no one warned you properly.

I give it a 7. It's too wilfully strange and too narratively loose to score higher. But that bathroom scene alone earns it the right to exist permanently.`
      ],
      verdict: "Gorgeous, bizarre, and completely unhinged. Cage at maximum Cage."
    },
    {
      id: 3,
      category: "movie",
      title: "Dredd",
      year: 2012,
      director: "Pete Travis",
      runtime: "95 min",
      rating: "R",
      genres: ["action", "sci-fi"],
      score: 9,
      featured: false,
      excerpt: "The superhero film that never got its sequel. Karl Urban never once removes the helmet and that alone earns respect. One of the best R-rated action films we've got.",
      body: [
        `Let me tell you what Dredd does not do, because this is almost more impressive than what it does do.

It does not give you an origin story. It does not open with a young Dredd watching his parents get shot in an alley. It does not spend twenty minutes explaining the geopolitical structure of Mega-City One through expository dialogue while two characters stand in front of a map. It does not set up a cinematic universe. It does not tease a sequel in a post-credits scene. It does not ask you to feel sorry for its main character or understand his inner life or watch him grow as a person.

It just drops you into a city of 800 million people crammed into a strip of the American east coast after a nuclear catastrophe, tells you the Judges are the only law, and then shows you one day. One building. One very bad situation. That's it. Lean, unpretentious, and completely confident in what it is. The discipline required to make a film this focused, especially in the superhero genre, is genuinely rare. Hollywood could stand to study it.`,

        `Karl Urban plays Judge Dredd and he never once removes the helmet. Not once. In a genre that is almost constitutionally incapable of keeping a mask on its lead actor, that decision feels almost radical. Think about every superhero film you've seen where the mask comes off at exactly the moment it would make no tactical sense to remove it, purely so the studio can remind you which movie star you paid to see. Dredd refuses that completely.

Urban conveys everything through jaw and delivery alone. The sneer. The exhaustion. The absolute lack of interest in whether you like him or not. Dredd is not a character who needs your sympathy or your understanding. He is an institution made flesh. A walking sentence. And Urban commits to that so completely that it becomes, paradoxically, one of the most compelling superhero performances of the era, precisely because of everything it refuses to give you.

Olivia Thirlby as rookie Judge Anderson is the film's secret weapon. She's the audience surrogate, the one asking questions, the one with doubt, the one who still feels things. The dynamic between them works perfectly because the film doesn't force a thaw. Dredd doesn't warm up. He just acknowledges, briefly, that she didn't completely fail. That's as close to a compliment as this man gets.`,

        `The slo-mo sequences are what people remember and they should. Slo-mo is a drug in this film's world that makes everything look hyper-saturated and beautiful, and director of photography Anthony Dod Mantle shot its effects at 4000 frames per second. The result is violence that sits uncomfortably close to genuine beauty. Slow motion blood hitting a wall shouldn't look like that. It shouldn't make you feel like that. The fact that it does is an achievement in craft that deserves more recognition than it gets.

The villain, Ma-Ma played by Lena Headey, is genuinely menacing without resorting to theatrics. She's cold. She's practical. She built her empire the hard way and she'll protect it the same way. She and Dredd are mirror images of each other in a way the film is smart enough not to over-explain.

And then it bombed. $41 million worldwide against a $45 million budget. Reviews were decent, word of mouth was great, and none of it was enough. Dredd found its audience on home video and has been building a cult ever since, but we never got the sequel. Still waiting. Still angry about it. This film set up a world with so much room to expand, so many Judge characters to explore, and we got one shot and that was it.

Dredd is one of the best R-rated action films of the last twenty years. Not one of the best superhero films. One of the best action films, full stop. The fact that it's mentioned in the same sentence as box office disappointments is a genuine injustice. If you haven't fixed that yet, do it today.`
      ],
      verdict: "Phenomenal. The sequel we deserved and never got. Still waiting."
    }
];

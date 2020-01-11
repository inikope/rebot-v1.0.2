'use strict';
const line = require('@line/bot-sdk');
const express = require('express');
var request = require("request");
const instaProf = require('instagram-basic-data-scraper-with-username');
const instaDown = require('instagram-downloader');
const instaStory = require('instory');
const got = require('got');

// create LINE SDK config from env variables
const config = {
   channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
   channelSecret: process.env.CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.Client(config);

// create Express app
// about Express: https://expressjs.com/
const app = express();

app.get('/', (req, res) => {
    res.send('Res send!');
  });
  
  // register a webhook handler with middleware
  // about the middleware, please refer to doc
  app.post('/webhook', line.middleware(config), (req, res) => {
    Promise
      .all(req.body.events.map(handleEvent))
      .then((result) => res.json(result));
  });
  
  // simple reply function
	const replyText = (token, texts) => {
		texts = Array.isArray(texts) ? texts : [texts];
		return client.replyMessage(
			token,
			texts.map((text) => ({ type: 'text', text }))
	);
	};
	// Reply yg asli:
	// return client.replyMessage(event.replyToken, tutorVid);

    function checkBio(value){
        if(value){
            while(value.includes("\\")){
                value = value.replace("\\n","\n");
                value = value.replace('\\"','\"');
                value = value.replace("\\'","\'");    
            }
            return value;
        } else {
            return '-';
        }
    }

    //Bio IG
    function bioIG(token, igid){
            const p1 = instaProf.getFullname(igid);
            const p2 = instaProf.getBio(igid);
            const p3 = instaProf.getPosts(igid);
            const p4 = instaProf.getFollowers(igid);
            const p5 = instaProf.getFollowing(igid);
            const p6 = instaProf.getExternalUrl(igid);
            Promise.all([p1,p2,p3,p4,p5,p6]).then(function(values){
                console.log(values);
                const fullName = (values[0].data)? values[0].data : '-';
                const igbio = checkBio(values[1].data);
                const iglink = (values[5].data)? values[5].data : '-';
                const sendBio = "𝐍𝐚𝐦𝐚: "+ fullName +"\n𝐁𝐢𝐨:\n"+ igbio + "\n𝐏𝐨𝐬𝐭𝐬: "+ values[2].data +"\n𝐅𝐨𝐥𝐥𝐨𝐰𝐞𝐫𝐬: "+ values[3].data +"\n𝐅𝐨𝐥𝐥𝐨𝐰𝐢𝐧𝐠: "+ values[4].data +"\n𝐋𝐢𝐧𝐤: "+ iglink;
                return replyText(token, sendBio);    
            })
    }

    // Profil IG
    function profilIG(token, igid){
	    const p1 = instaProf.instaRegular(igid);
        const p2 = instaProf.instaHighDefinition(igid);
        
        Promise.all([p1,p2]).then(function(values){
            console.log(values);
            return client.replyMessage(token, {
                type: "image", originalContentUrl: values[1], previewImageUrl: values[0]
            });    
        })
    }

    // Story IG
    function IGstory(token,igid, number){
        const url = `https://api.storiesig.com/stories/${igid}`;

	const p1 = got(url).json().then(res => {
        console.log("res: " + res);
        console.log("res.body: " + res.body);
		const base = res.body.items;
		const stories = {story: [],preview: []};

		for (let i = 0; i < base.length; i++) {
            base[i].video_versions === undefined ? stories.story.push(base[i].image_versions2.candidates[0].url) : stories.story.push(base[i].video_versions[0].url);
            stories.preview.push(base[i].image_versions2.candidates[0].url);
        }
        return stories;
    });
        Promise.all([p1]).then(function(values){
        console.log("values[0].story[0]: " + values[0].story[0]);
        console.log("values[0].preview[0]: " + values[0].preview[0]);
        if(values[0].story[number].includes(".mp4")){
            return client.replyMessage(token, {
                type: "video", originalContentUrl: values[0].story[number], previewImageUrl: values[0].preview[number]
            })
        } else {
            return client.replyMessage(token, {
                type: "image", originalContentUrl: values[0].story[number], previewImageUrl: values[0].preview[number]
            })
        }})//.catch(function(){
        //     return replyText(token,"Maaf, sepertinya akunnya private... Atau, angka yang kamu masukkan kelebihan... ?")
        // });
    }

    // Multipost IG
    function IGmulti(token, igid, number){
        const p1 = instaDown(igid).then(hasil => {
            const { entry_data: { PostPage } } = hasil;
            return PostPage.map(post => post.graphql.shortcode_media.edge_sidecar_to_children.edges);
        }).then(data => {
            const lebar = data[0].length;
            const list = {media: [],preview: []};

    		for (let skazjla = 0; skazjla < lebar; skazjla++) {
                const videoUrl = data[0][skazjla].node.video_url;
                const edge = data[0][skazjla].node.display_url;
                videoUrl === undefined ? list.media.push(edge) : list.media.push(videoUrl);
                list.preview.push(edge);
            }
            console.log("data: " + list);
    	    return list;
        })
        Promise.all([p1]).then(function(values){
            console.log("values[0].media[0]: " + values[0].media[0]);
            console.log("values[0].preview[0]: " + values[0].preview[0]);
            if(values[0].media[number].includes(".mp4")){
                return client.replyMessage(token, {
                    type: "video", originalContentUrl: values[0].media[number], previewImageUrl: values[0].preview[number]
                })
            } else {
                return client.replyMessage(token, {
                    type: "image", originalContentUrl: values[0].media[number], previewImageUrl: values[0].preview[number]
                })
            }}).catch(function(){
                return replyText(token,"Maaf, sepertinya akunnya private... Atau, angka yang kamu masukkan kelebihan... ?")
            });
    }

    // Caption IG
    function IGcapt(token, igid){
        const p1 = instaDown(igid).then(data => {
            const { entry_data: { PostPage } } = data;
            console.log(PostPage.map(post => post.graphql.shortcode_media.edge_media_to_caption.edges[0]));
            return PostPage.map(post => post.graphql.shortcode_media.edge_media_to_caption.edges[0])
        }).catch(function(){
            return replyText(token,"Maaf, sepertinya akunnya private.")
        }).then(images => images.map(img => img.node.text)).catch(function(){
            return replyText(token,"Maaf, sepertinya akunnya private.")
        })
        Promise.all([p1]).then(function(values){
            console.log(values[0][0]);
            return replyText(token, "𝐂𝐚𝐩𝐭𝐢𝐨𝐧:\n" + values[0][0]);
            }).catch(function(){
                return replyText(token,"Maaf, sepertinya akunnya private.")
            });
        }


    // Foto Vid IG
    function IGfoto(token, igid){
        const p1 = instaDown(igid).then(data => {
            const { entry_data: { PostPage } } = data;
            console.log(PostPage.map(post => post.graphql.shortcode_media));
            return PostPage.map(post => post.graphql.shortcode_media)
        }).catch(function(){
            return replyText(token,"Maaf, sepertinya akunnya private.")
        }).then(images => images.map(img => img.display_url)).catch(function(){
            return replyText(token,"Maaf, sepertinya akunnya private.")
        })
        Promise.all([p1]).then(function(values){
            console.log(values);
            return client.replyMessage(token, {
            type: "image", originalContentUrl: values[0][0], previewImageUrl: values[0][0]
        }).catch(function(){
            return replyText(token,"Maaf, sepertinya akunnya private.")
        });
        })
    }
    function IGvid(token, igid){
        const p1 = instaDown(igid).then(data => {
            const { entry_data: { PostPage } } = data;
            console.log(PostPage.map(post => post.graphql.shortcode_media));
            return PostPage.map(post => post.graphql.shortcode_media)
        }).catch(function(){
            return replyText(token,"Maaf, sepertinya akunnya private.")
        }).then(images => images.map(img => img.display_url)).catch(function(){
            return replyText(token,"Maaf, sepertinya akunnya private.")
        })
        const p2 = instaDown(igid).then(data => {
            const { entry_data: { PostPage } } = data;
            console.log(PostPage.map(post => post.graphql.shortcode_media));
            return PostPage.map(post => post.graphql.shortcode_media)
        }).catch(function(){
            return replyText(token,"Maaf, sepertinya akunnya private.")
        }).then(images => images.map(img => img.video_url)).catch(function(){
            return replyText(token,"Maaf, sepertinya akunnya private.")
        })
        Promise.all([p1,p2]).then(function(values){
            console.log(values);
            return client.replyMessage(token, {
            type: "video", originalContentUrl: values[1][0], previewImageUrl: values[0][0]
        }).catch(function(){
            return replyText(token,"Maaf, sepertinya akunnya private.")
        });
        })
    }

  // event handler
  function handleEvent(event) {
     
     //  Chats
    const sendHelp 		= "𝙍𝙀:𝘽𝙊𝙏 dapat melakukan beberapa hal loh...\nCoba yuk command-command 𝙍𝙀:𝘽𝙊𝙏 berikut ini!\n\n\n/𝐡𝐞𝐥𝐩 - Untuk melihat command yang kami punya\n/𝐯𝐢𝐝𝐞𝐨𝐢𝐠 - Untuk menyimpan video dari instagram\n/𝐟𝐨𝐭𝐨𝐢𝐠 - Untuk menyimpan foto dari instagram\n/𝐜𝐚𝐩𝐭𝐢𝐨𝐧𝐢𝐠 - Untuk mengecek caption dari post di instagram\n/𝐦𝐮𝐥𝐭𝐢𝐩𝐨𝐬𝐭 - Untuk menyimpan multiple foto/video dari post instagram\n/𝐛𝐢𝐨𝐢𝐠 - Untuk mengecek bio profil instagram\n/𝐩𝐫𝐨𝐟𝐢𝐥𝐢𝐠 - Untuk mengecek foto profil instagram\n/𝐬𝐭𝐨𝐫𝐲𝐢𝐠 - Untuk menyimpan foto atau video dari instastory\n/𝐚𝐛𝐨𝐮𝐭 - Untuk mengetahui lebih lanjut tentang 𝙍𝙀:𝘽𝙊𝙏\n\n\n\u2665";
    const tutorFoto	 	= "Begini nih cara menggunakan commandnya\n\n/fotoig (link post instagram)";
    const tutorVid 		= "Begini nih cara menggunakan commandnya\n\n/videoig (link post instagram)";
    const tutorStory 	= "Begini nih cara menggunakan commandnya\n\n/storyig (username instagram) (story ke berapa)";
    const tutorCaption 	= "Begini nih cara menggunakan commandnya\n\n/captionig (link post instagram)";
    const tutorCek 		= "Begini nih cara menggunakan commandnya\n\n/bioig (username instagram)";
    const tutorPP 		= "Begini nih cara menggunakan commandnya\n\n/profilig (username instagram)";
    const tutorMulti    = "Begini nih cara menggunakan commandnya\n\n/multipost (link post instagram) (foto/video ke berapa)";
    const errormess 	= "Terima kasih atas pesannya\nSayang sekali, akun ini masih goblok";
    const sendIntro 	=  "𝙍𝙀:𝘽𝙊𝙏 dapat melakukan beberapa hal loh..\nCoba yuk!\nKetik /help untuk melihat command-command yang kami punya.\n\n\u2605";
    const aboutMe 		= "𝙍𝙀:𝘽𝙊𝙏 adalah chatbot yang dapat membantumu menyimpan foto maupun video dari Instagram.\n\n𝙍𝙀:𝘽𝙊𝙏 dibuat oleh:\n- [2201801636] Hans Nugroho Gianto Hadiwijaya\n- [2201758285] Casandra\n- [2201787915] Mita\n\n\n\uD83C\uDF6C";
    const sendHello 	= "Welcome to 𝙍𝙀:𝘽𝙊𝙏!\n\n𝙍𝙀:𝘽𝙊𝙏 dapat melakukan beberapa hal loh..\nCoba yuk!\nKetik /help untuk melihat command-command yang kami punya.";


	if (event.type === 'follow'){
		return replyText(event.replyToken, sendHello);
	} else if (event.type !== 'message' || event.message.type !== 'text') {
      // ignore non-text-message event
      return replyText(event.replyToken, sendIntro);
    } else {
        const receivedMessage = event.message.text;
        if (receivedMessage.split(" ").length === 3){
            const splitText = receivedMessage.split(" ");
            const command = splitText[0];
            const link = splitText[1];
            switch (command){
                case '/multipost':
                    const numbpost = parseInt(splitText[2]);
                    return IGmulti(event.replyToken, link, numbpost-1);
                case '/storyig':
                    const numbstory = parseInt(splitText[2]);
                    return IGstory(event.replyToken, link, numbstory-1);
                case '/echo':
                    return replyText(event.replyToken, link + " " + split.text[2]);
                default:
                    return replyText(event.replyToken, errormess);
            }
        } else if (receivedMessage.split(" ").length === 2){
            const splittedText = receivedMessage.split(" ");
            const inicommand = splittedText[0];
            const link = splittedText[1];
            switch (inicommand) {
                case '/videoig':
                    return IGvid(event.replyToken, link);
                    break;
                case '/fotoig':
                    return IGfoto(event.replyToken, link);
                    break;
                case '/captionig':
                    return IGcapt(event.replyToken, link);
                    break;
                case '/storyig':
                    return replyText(event.replyToken, tutorStory);
                    break;
                case '/bioig':
                    return bioIG(event.replyToken, link);
                    break;
                case '/profilig':
                    return profilIG(event.replyToken, link);
                    break;
        		case '/echo':
        		    return replyText(event.replyToken, link);
                    break;
                case '/multipost':
                    return replyText(event.replyToken, tutorMulti);
                default:
                    return replyText(event.replyToken, errormess);
                    break;
            }
        } else {
            switch (receivedMessage) {
                case '/multipost':
                    return replyText(event.replyToken, tutorMulti);
                case '/help':
                    return replyText(event.replyToken, sendHelp);
                    break;
                case '/videoig':
                    return replyText(event.replyToken, tutorVid);
                    break;
                case '/fotoig':
                    return replyText(event.replyToken, tutorFoto);
                    break;
                case '/captionig':
                    return replyText(event.replyToken, tutorCaption);
                    break;
                case '/storyig':
                    return replyText(event.replyToken, tutorStory);
                    break;
                case '/bioig':
                    return replyText(event.replyToken, tutorCek);
                    break;
                case '/profilig':
                    return replyText(event.replyToken, tutorPP);
                    break;
                case '/about':
                    return replyText(event.replyToken, aboutMe);
                    break;
                default:
                    return replyText(event.replyToken, sendIntro);
                    break;
            }
        }
  }
  }  
  // listen on port
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`listening on ${port}`);
  });

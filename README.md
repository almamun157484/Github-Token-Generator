# GitHub OAuth টোকেন ম্যানেজার

ক্রিয়েটেড বাই মামুন। যে কেউ নিজের গিটহাব অ্যাকাউন্ট দিয়ে লগইন করে নিজের টোকেন নিতে পারবে।

## ফাইলগুলো
- `index.html` : দেখতে যা দেখা যায় (ডিজাইন)
- `api/[action].js` : পেছনের সার্ভার অংশ (লগইন, টোকেন, মেয়াদ, বাতিল)
- `package.json`, `.env.example` : সেটিংস

## সার্ভার কেন লাগে?
গিটহাব টোকেন দেওয়ার আগে একটা গোপন কী (Client Secret) চায়। এটা ওয়েবসাইটের ভেতরে রাখলে যে কেউ দেখে ফেলতে পারে। তাই একটা ছোট সার্ভার লাগে, যেখানে এই গোপন কী নিরাপদে থাকে। Vercel এই সার্ভার ফ্রিতে দেয়। আপনাকে কোনো সার্ভার কিনতে বা চালাতে হবে না।

## লাইভ করার সহজ ধাপ
**১. গিটহাবে ফাইল রাখুন**
- github.com → + → New repository → নাম `token-manager`, Public → Create।
- uploading an existing file দিয়ে `index.html`, `package.json`, `.env.example` আপলোড করে Commit করুন।
- Add file → Create new file। নামের ঘরে লিখুন `api/[action].js`, নিচে ফাইলের কোড পেস্ট করে Commit করুন।

**২. Vercel এ চালু করুন**
- vercel.com → Continue with GitHub → Add New → Project → `token-manager` Import → Deploy।
- পাওয়া লিংকটি কপি করুন, যেমন `https://token-manager-xyz.vercel.app`

**৩. গিটহাবে OAuth App বানান**
- github.com/settings/developers → OAuth Apps → New OAuth App
- Homepage URL: আপনার Vercel লিংক
- Authorization callback URL: আপনার Vercel লিংক + `/api/callback`
- Register application → Client ID কপি করুন → Generate a new client secret → Secret কপি করুন (আর দেখা যাবে না)।

**৪. Vercel এ গোপন ভ্যালু দিন**
- Project → Settings → Environment Variables:
  - `GITHUB_CLIENT_ID` = Client ID
  - `GITHUB_CLIENT_SECRET` = Secret
  - `SESSION_SECRET` = যেকোনো ৩২+ অক্ষরের র‍্যান্ডম লেখা
- Deployments → সর্বশেষটির ⋯ → Redeploy। (এটা না করলে ভ্যালু কাজ করবে না।)

**৫. পরীক্ষা করুন**
Vercel লিংক খুলে Login with GitHub চাপুন।

## নিরাপত্তা
- Client Secret কখনো কোডে বা গিটহাবে লিখবেন না, শুধু Vercel এ রাখুন।
- সার্ভার কারও টোকেন জমা রাখে না। টোকেন এনক্রিপ্ট করা কুকিতে ব্যবহারকারীর ব্রাউজারে থাকে।
- গিটহাব OAuth টোকেনের নিজের মেয়াদ নেই, তাই মেয়াদ এই অ্যাপ গোনে। মেয়াদ শেষের পর ব্যবহারকারী সাইটে ঢুকলে বা "এখনই বাতিল" চাপলে টোকেন গিটহাব থেকে বাতিল হয়। ফিরে না এলে github.com/settings/applications থেকে নিজে বাতিল করা যায়।

## ড্যাশবোর্ডে যা কাজ করে (সব আসল)
- আসল গিটহাব লগইন, আসল টোকেন, আসল প্রোফাইল ও ইমেইল (ইমেইল পাবলিক থাকলে)।
- মেয়াদ বাছাই/বাড়ানো/কমানো, "এখনই বাতিল" চাপলে টোকেন গিটহাব থেকে বাতিল হয়।
- লাইভ API টেস্টার: প্রোফাইল পড়া, Star, Follow, Push (token-manager-test.txt ফাইল), Workflow চালানো। এগুলো আসল কাজ।
- পারমিশন বদলাতে চাইলে বেছে নিয়ে "এই পারমিশন দিয়ে নতুন টোকেন নিন" চাপুন।
- ডিজাইন Tailwind CDN ও Google Fonts ব্যবহার করে, তাই ইন্টারনেট লাগবে।

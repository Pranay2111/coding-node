const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');
const Post = require('../../models/Posts');
const User = require('../../models/User');
const Profile = require('../../models/Profile');

//@route POST api/posts
//@desc Create a post
//@access Privet
router.post(
  '/',
  [
    auth,
    [
      check('text', 'Text is required')
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await User.findById(req.user.id).select('-password');

      const newPost = new Post({
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      });
      const post = await newPost.save();
      res.json(post);
    } catch (error) {
      console.log(error);
      res.status(500).send('Sever error');
    }
  }
);

//@route GET api/posts
//@desc Get all the post
//@access Privet
router.get('/', auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
  } catch (error) {
    console.log(error);
    res.status(500).send('Sever error');
  }
});

//@route GET api/posts/:id
//@desc Get the post by id
//@access Privet
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) res.status(404).json({ msg: 'Post not found' });
    res.json(post);
  } catch (error) {
    if (error.kind == 'ObjectId') {
      return res.status(404).json({ msg: 'Post not found' });
    }
    res.status(500).send('Sever error');
  }
});

//@route DELETE api/posts/:id
//@desc Delete the post
//@access Privet
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ msg: 'Post not found' });
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    await post.remove();
    res.json({ msg: `Post removed` });
  } catch (error) {
    if (error.kind == 'ObjectId') {
      return res.status(404).json({ msg: 'Post not found' });
    }
    res.status(500).send('Sever error');
  }
});

//@route PUT api/posts/like/:id
//@desc like the post by user id only once
//@access Privet
router.put('/like/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    //check if the post has been already liked
    if (
      post.likes.filter(like => like.user.toString() === req.user.id).length > 0
    ) {
      return res.status(400).json({ msg: 'Post already liked' });
    }

    post.likes.unshift({ user: req.user.id });
    await post.save();
    res.json(post.likes);
  } catch (err) {
    console.log(err);
    res.status(500).send('Sever error');
  }
});

//@route PUT api/posts/unlike/:id
//@desc unlike the post by user id only once
//@access Privet
router.put('/unlike/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    //check if the post has been already liked
    if (
      post.likes.filter(like => like.user.toString() === req.user.id).length ===
      0
    ) {
      return res.status(400).json({ msg: 'Post has not yet been liked' });
    }
    // get remove index
    const removIndex = post.likes
      .map(like => like.user.toString())
      .indexOf(req.user.id);

    post.likes.splice(removIndex, 1);
    await post.save();
    res.json(post.likes);
  } catch (err) {
    console.log(err);
    res.status(500).send('Sever error');
  }
});

//@route POST api/posts/comment/:id
//@desc add comment on users post
//@access Privet
router.post(
  '/comment/:id',
  [
    auth,
    [
      check('text', 'Text is required')
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await User.findById(req.user.id).select('-password');
      const post = await Post.findById(req.params.id);

      const newComment = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      };
      post.comments.unshift(newComment);
      await post.save();
      res.json(post.comments);
    } catch (error) {
      console.log(error);
      res.status(500).send('Sever error');
    }
  }
);

//@route DELETE api/posts/comments/:id/:comment_id
//@desc Delete the post comment
//@access Privet
router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    //Pull out comment
    const comment = post.comments.find(
      comment => comment.id === req.params.comment_id
    );

    //make sure comment exist
    if (!comment) {
      res.status(404).json({ msg: 'Comment does not exist' });
    }

    //check user
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorised' });
    }

    //get remove comments
    const removeComments = post.comments
      .map(comment => comment.user.toString())
      .indexOf(req.user.id);

    post.comments.splice(removeComments);

    await post.save();
    res.json(post);
  } catch (error) {
    if (error.kind == 'ObjectId') {
      return res.status(404).json({ msg: 'Post not found' });
    }
    res.status(500).send('Sever error');
  }
});
module.exports = router;

/**
 * @author Sultan
 * post recomendations logic. 
*/

const Post = require('../modles/postModle');
const Hashtag = require('../modles/hashtagModle');

class PostRecomendations {
    async setRecomendationsUsingHashtags(hashtags, userId) {
        const posts = await Post.find();
        const related = [];
        const unrelated = [];

        for (const hashtag of hashtags) {
            inner: for (let i = 0; i < posts.length; i++) {
                // check if the post does not belong to the user
                if (posts[i].userId != userId) {
                    // check if the post has any of the hashtags that the user has interacted with,
                    // and that the post is not a duplicate
                    if (posts[i].hashtags && posts[i].hashtags.includes(hashtag)
                        && !related.includes(posts[i]._id)) {
                        // added it to the related posts list
                        related.push(posts[i]._id);
                    } else {
                        // check that the unrelated post is not a duplicate
                        if (!unrelated.includes(posts[i]._id)) {
                            // add it to the unrelated posts list
                            unrelated.push(posts[i]._id);
                        }
                    }
                }
            }
        }

        // shuffle both lists, and return them as one array
        const recomendations = this.sortRecomendations(related, unrelated);
        return recomendations;
    }

    /**
     * gets posts from various hashtags, and shuffles them.
     * @param {String} hashtagsIds the IDs for the hashtags
     */
    async getShuffledHashtagPosts(hashtagsIds) {
        const hashtags = await Hashtag.find().where('_id').in(hashtagsIds);
        const postIds = [];

        for (const ht of hashtags) {
            postIds.push(...ht.postIds);
        }

        this.shuffle(postIds);

        return postIds;
    }

    /**
     * shuffles the lists of posts, based on whether they are related to the user or not.
     * 
     * @param relatedPosts posts that are related to the user's activity
     * @param unrelatedPosts posts that are unrelated to the user's activity
     * 
     * @return a list of recomended posts; such that, the top of the top of the list would be related to the user's activity, and the bottom
     * of the list is unrelated to the user's ativity
     */
    sortRecomendations(relatedPosts, unrelatedPosts) {
        this.shuffle(relatedPosts);
        this.shuffle(unrelatedPosts);

        return [...relatedPosts, ...unrelatedPosts];
    }

    /**
     * shuffles an array's elements.
     * 
     * @param arr the array of elements that we want to shuffle
     */
    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const index = Math.floor(Math.random() * i);
            const temp = arr[index];
            arr[index] = arr[i];
            arr[i] = temp;
        }
    }
}

module.exports = PostRecomendations;

/**
 * @author Sultan
 * handles array manipilations.
 */

class ArrayUtils {
    /**
     * quick sorts posts by date
     * @param {Array} arr array of posts
     * @param {Number} low start index
     * @param {Number} high end index
     */
    quickSortPosts(arr, low, high) {
        if (low < high) {
            const pivot = this.partition(arr, low, high);

            this.quickSortPosts(arr, low, pivot);
            this.quickSortPosts(arr, pivot + 1, high);
        }
    }

    partition(arr, low, high) {
        let i = low;
        let j = high;
        const pivot = new Date(arr[low].datetime);

        while (i < j) {
            while (new Date(arr[i].datetime) <= pivot) {
                i++;
            }

            while (new Date(arr[j].datetime) > pivot) {
                j--;
            }

            if (i < j) {
                const temp = arr[i];
                arr[i] = arr[j];
                arr[j] = temp;
            }
        }

        const temp = arr[low];
        arr[low] = arr[j];
        arr[j] = temp;

        return j;
    }
}

module.exports = ArrayUtils;

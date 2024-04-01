/**
 * Takes an array and string. Sorting the array so that the specified string is moved to the first position of the array.
 * @param array Array to be sorted.
 * @param stringToMove String to move to front of array.
 * @returns Sorted array.
 */
function sortStringToFrontOfArray(array: string[], stringToMove: string) {
	return array.sort((a, b) => {
		if (a === stringToMove) {
			return -1;
		} // 'A' is the string to move, sort it to the front

		if (b === stringToMove) {
			return 1;
		} // 'B' is the string to move, sort 'A' to the back

		return 0; // No change in order. String doesn't exist in array.
	});
}

export {sortStringToFrontOfArray};

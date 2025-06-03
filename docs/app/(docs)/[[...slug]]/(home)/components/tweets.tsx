import { Tweet } from "react-tweet";

const tweets = [
	["1855005109572247585", "1863809657543799251", "1915946188635050258"],
	["1891799924343197884", "1882412853656977654", "1885643702502150218"],
	[
		"1882561938141634712",
		"1889956770472403335",
		"1883945341185355949",
		"1914441046618214702",
	],
];

export const Tweets = () => (
	<div className="grid relative grid-cols-3 [&_.react-tweet-theme]:mt-0! gap-4 px-8 h-[900px] overflow-hidden">
		<div className="absolute top-0 left-0 w-full h-72 bg-gradient-to-b from-background to-transparent z-10" />
		{tweets.map((tweet) => (
			<div key={tweet[0]} className="-mt-2">
				{tweet.map((id) => (
					<Tweet key={id} id={id} />
				))}
			</div>
		))}
		<div className="absolute bottom-0 left-0 w-full h-72 bg-gradient-to-t from-background to-transparent z-10" />
	</div>
);

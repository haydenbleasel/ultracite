// biome-ignore lint/style/noDefaultExport: Demonstrating default export usage
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const demoComponent = () => {
	const [count, setCount] = useState(0);
	const [data, setData] = useState(null);

	useEffect(() => {
		fetch("https://api.example.com/data")
			.then((res) => res.json())
			.then((json) => {
				setData(json);
			});
	}, []);

	const handleClick = () => {
		setCount(count + 1);
	};

	return (
		<div className="container">
			<h1>Hello world</h1>
			<button onClick={handleClick}>Click me</button>
			<Link to="/about">About</Link>
			<div dangerouslySetInnerHTML={{ __html: "<p>Unsafe HTML</p>" }} />
		</div>
	);
};

export default demoComponent;

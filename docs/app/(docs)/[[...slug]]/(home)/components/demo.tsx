import { codeToHtml } from "shiki";
import { cn } from "@/lib/utils";

const oldCode = `import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const demoComponent = () => {
  const [count, setCount] = useState(0)
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('https://api.example.com/data')
      .then(res => res.json())
      .then(json => {
        setData(json)
      })
  }, [])

  const handleClick = () => {
    setCount(count + 1)
  }

  return (
    <div className="container">
      <h1>Hello world</h1>
      <button onClick={handleClick}>Click me</button>
      <Link to="/about">About</Link>
      <div dangerouslySetInnerHTML={{ __html: '<p>Unsafe HTML</p>' }} />
    </div>
  )
}

export default demoComponent`;

const newCode = `

`;

export const Demo = async () => {
	const oldHtml = await codeToHtml(oldCode as string, {
		lang: "typescript",
		themes: {
			light: "vitesse-light",
			dark: "vitesse-dark",
		},
	});

	return (
		<div className="p-16 sm:py-24">
			<div
				className={cn(
					"aspect-video bg-secondary p-6 w-full max-w-5xl mx-auto rounded-lg overflow-hidden",
					"[&_.shiki]:bg-transparent!",
				)}
			>
				<div dangerouslySetInnerHTML={{ __html: oldHtml }} />
			</div>
		</div>
	);
};

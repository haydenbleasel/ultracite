import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import clsx from 'clsx'

import { useFeed } from '@/components/FeedProvider'
import { FormattedDate } from '@/components/FormattedDate'

export const a = Link

export const wrapper = function Wrapper({ children }) {
  return children
}

export const h2 = function H2(props) {
  let { isFeed } = useFeed()

  if (isFeed) {
    return null
  }

  return <h2 {...props} />
}

export const img = function Img(props) {
  return (
    <div className="relative mt-8 overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-900 [&+*]:mt-8">
      <Image
        alt=""
        sizes="(min-width: 1280px) 36rem, (min-width: 1024px) 45vw, (min-width: 640px) 32rem, 95vw"
        {...props}
      />
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-gray-900/10 dark:ring-white/10" />
    </div>
  )
}

function ContentWrapper({ className, children }) {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:flex lg:px-8">
      <div className="lg:ml-96 lg:flex lg:w-full lg:justify-end lg:pl-32">
        <div
          className={clsx(
            'mx-auto max-w-lg lg:mx-0 lg:w-0 lg:max-w-xl lg:flex-auto',
            className
          )}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

function ArticleHeader({ id, date }) {
  return (
    <header className="relative mb-10 xl:mb-0">
      <div className="pointer-events-none absolute left-[max(-0.5rem,calc(50%-18.625rem))] top-0 z-50 flex h-4 items-center justify-end gap-x-2 lg:left-0 lg:right-[calc(max(2rem,50%-38rem)+40rem)] lg:min-w-[32rem] xl:h-8">
        <Link href={`#${id}`} className="inline-flex">
          <FormattedDate
            date={date}
            className="hidden xl:pointer-events-auto xl:block xl:text-2xs/4 xl:font-medium xl:text-white/50"
          />
        </Link>
        <div className="h-[0.0625rem] w-3.5 bg-gray-400 lg:-mr-3.5 xl:mr-0 xl:bg-gray-300" />
      </div>
      <ContentWrapper>
        <div className="flex">
          <Link href={`#${id}`} className="inline-flex">
            <FormattedDate
              date={date}
              className="text-2xs/4 font-medium text-gray-500 dark:text-white/50 xl:hidden"
            />
          </Link>
        </div>
      </ContentWrapper>
    </header>
  )
}

export const article = function Article({ id, title, date, children }) {
  let { isFeed } = useFeed()
  let heightRef = useRef()
  let [heightAdjustment, setHeightAdjustment] = useState(0)

  useEffect(() => {
    let observer = new window.ResizeObserver(() => {
      let { height } = heightRef.current.getBoundingClientRect()
      let nextMultipleOf8 = 8 * Math.ceil(height / 8)
      setHeightAdjustment(nextMultipleOf8 - height)
    })

    observer.observe(heightRef.current)

    return () => {
      observer.disconnect()
    }
  }, [])

  if (isFeed) {
    return (
      <article>
        <script
          type="text/metadata"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({ id, title, date }),
          }}
        />
        {children}
      </article>
    )
  }

  return (
    <article
      id={id}
      className="scroll-mt-16"
      style={{ paddingBottom: `${heightAdjustment}px` }}
    >
      <div ref={heightRef}>
        <ArticleHeader id={id} date={date} />
        <ContentWrapper className="typography">{children}</ContentWrapper>
      </div>
    </article>
  )
}

export const code = function Code({ highlightedCode, ...props }) {
  if (highlightedCode) {
    return (
      <code {...props} dangerouslySetInnerHTML={{ __html: highlightedCode }} />
    )
  }

  return <code {...props} />
}

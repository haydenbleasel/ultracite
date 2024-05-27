import type { FC, ComponentProps } from 'react';

type ButtonProps = ComponentProps<'button'>;

export const Button: FC<ButtonProps> = (props) => (
  <button type="button" {...props} />
);

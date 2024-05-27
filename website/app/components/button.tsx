import { FC, ComponentProps } from 'react';

type ButtonProps = ComponentProps<'button'>;

export const Button: FC<ButtonProps> = (props) => {
  return <button {...props} />;
};

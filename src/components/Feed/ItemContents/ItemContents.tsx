import { IItemContent, IItems } from '@interface/excel';
import styles from './ItemContents.module.scss';

const ItemContents = ({ itemContent }: { itemContent?: IItemContent }) => {
  if (!itemContent) {
    return null;
  }

  const {
    profileText,
    profileImageUrl,
    titleImageText,
    titleImageUrl,
    titleImageCategory,
    items,
    sum,
    sumOp,
  } = itemContent;

  return (
    <>
      <div className={styles.profile}>
        {profileImageUrl && <img src={profileImageUrl}></img>}
        {profileText && <p className={styles.profileText}>{profileText}</p>}
      </div>
      <div className={styles.line} />
      <div className={styles.title}>
        <div>
          {titleImageText && <p className={styles.text}>{titleImageText}</p>}
          {titleImageCategory && <p className={styles.imageCategory}>{titleImageCategory}</p>}
        </div>
        {titleImageUrl && <img src={titleImageUrl}></img>}
      </div>
      <div className={styles.line} />
      {items &&
        items.map(({ item, itemOp }: IItems) => (
          <div className={styles.items}>
            <p className={styles.item}>{item}</p>
            <p>{itemOp}</p>
          </div>
        ))}
      <div className={styles.sums}>
        {sum && <p className={styles.sum}>{sum}</p>}
        {sumOp && <p className={styles.sumOp}>{sumOp}</p>}
      </div>
      <div className={styles.line} />
    </>
  );
};

export default ItemContents;

{
  /*  */
}

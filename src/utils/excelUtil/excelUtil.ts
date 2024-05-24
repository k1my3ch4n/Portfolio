import {
  IButtonData,
  IButtonsData,
  IContentData,
  ILinkData,
  ILocationData,
  ITextData,
  MessageType,
} from '@interface/excel';
import { read, Range, Sheet, utils } from 'xlsx';

export type ExcelRecord = Record<string, string | null>;

export interface ButtonsType {
  buttonTitle: string;
  buttonLink: string;
}

const trimColumns = (records: ExcelRecord): ExcelRecord => {
  return Object.entries(records).reduce<ExcelRecord>((acc, [key, value]) => {
    acc[key.trim()] = value;

    return acc;
  }, {});
};

export const excelFileToRecords = async (excelFile: File) => {
  try {
    const sheet: Sheet = await (() =>
      new Promise((resolve, reject) => {
        const fileReader = new FileReader();

        fileReader.onload = (e: ProgressEvent<FileReader>) => {
          if (!e.target?.result) {
            return;
          }

          const arrayBuffer = e.target.result;

          const workbook = read(arrayBuffer);

          const sheet = workbook.Sheets[workbook.SheetNames[0]];

          // ? sheet['!merges']는 병합된 셀의 range 객체를 포함하는 리스트를 반환
          sheet['!merges']?.forEach((range: Range) => {
            // ? encode_range 메서드를 사용하여 top-left 셀 구하기 (병합된 셀의 값은 top-left 셀에만 적용되기 때문)
            const topLeftCell = utils.encode_range(range).split(':')[0];

            for (let column = range.s.c; column <= range.e.c; column++) {
              for (let row = range.s.r; row <= range.e.r; row++) {
                sheet[String.fromCharCode(65 + column) + (row + 1)] = sheet[topLeftCell];
              }
            }
          });

          resolve(sheet);
        };

        fileReader.onerror = () => {
          reject(new Error('fileReader error'));
        };

        fileReader.readAsArrayBuffer(excelFile);
      }))();

    return utils
      .sheet_to_json<ExcelRecord>(sheet, { defval: null })
      .map((row) => trimColumns(row))[0];
  } catch (e) {
    console.error(e);
    throw Error('excelFileToRecords error');
  }
};

export const recordsToSendData = ({
  objectType,
  record,
}: {
  objectType: MessageType;
  record: ExcelRecord;
}) => {
  let sendData = {};

  if (objectType === 'commerce') {
    sendData = {
      objectType,
      content: {
        title: record['content_title'],
        description: record['content_description'],
        imageUrl: record['content_image_url'],
        link: {
          webUrl: record['content_web_url'],
          mobileWebUrl: record['content_mobile_web_url'],
        },
      },
      commerce: {
        productName: record['product_name'], // 필수 아님
        regularPrice: record['regular_price'], // 필수
        discountPrice: 'discountPrice', // 필수 아님
        discountRate: 'discountRate', // 필수 아님
        fixedDiscountPrice: 'fixedDiscountPrice', // 필수 아님
        currency_unit: 'currency_unit', // 필수 아님
        currencyUnitPosition: 1, // 필수 아님
      },
      button_title: 'buttonTitle', // 버튼 이름 변경
      buttons: [
        // 버튼이 여러개인 경우 ( 최대 2개 )
        {
          title: 'buttonTitle1',
          link: {
            webUrl: record['content_web_url'],
            mobileWebUrl: record['content_mobile_web_url'],
          },
        },
        {
          title: 'buttonTitle2',
          link: {
            webUrl: record['content_web_url'],
            mobileWebUrl: record['content_mobile_web_url'],
          },
        },
      ],
    };
  }

  // todo : calendar id 해결해야 함.
  if (objectType === 'calendar') {
    sendData = {
      objectType,
      idType: record['IdType'],
      id: record['id'],
      content: {
        title: record['content_title'],
        description: record['content_description'],
        imageUrl: record['content_image_url'],
        link: {
          webUrl: record['content_web_url'],
          mobileWebUrl: record['content_mobile_web_url'],
        },
      },
    };
  }

  return sendData;
};

export const parsingButtonUtil = (record: ExcelRecord): ButtonsType[] => {
  const singleButtonTitle = record['button_title'];
  const singleButtonLink = record['content_web_url'];
  const singleButtonMobileLink = record['content_mobile_web_url'];

  const buttonTitle1 = record['buttons_title1'];
  const buttonTitle2 = record['buttons_title2'];

  const buttonLink1 = record['buttons_web_url1'];
  const buttonLink2 = record['buttons_web_url2'];

  const buttonMobileLink1 = record['buttons_mobile_web_url1'];
  const buttonMobileLink2 = record['buttons_mobile_web_url2'];

  // ? 버튼 타이틀이 존재하고 , 둘 중 한 개의 링크가 존재하는 경우 버튼이 있다고 간주
  const hasButton1 = !!buttonTitle1 && (!!buttonLink1 || !!buttonMobileLink1);
  const hasButton2 = !!buttonTitle2 && (!!buttonLink2 || !!buttonMobileLink2);

  // ? 버튼 두개가 존재하는 경우 , 여러 버튼이 있는 것으로 간주
  const hasManyButtons = hasButton1 && hasButton2;

  // ? 버튼 array return
  if (hasManyButtons) {
    return [
      {
        buttonTitle: buttonTitle1,
        buttonLink: buttonLink1 ?? buttonMobileLink1 ?? '',
      },
      {
        buttonTitle: buttonTitle2,
        buttonLink: buttonLink2 ?? buttonMobileLink2 ?? '',
      },
    ];
  }

  if (hasButton1) {
    return [
      {
        buttonTitle: buttonTitle1,
        buttonLink: buttonLink1 ?? buttonMobileLink1 ?? '',
      },
    ];
  }

  if (hasButton2) {
    return [
      {
        buttonTitle: buttonTitle2,
        buttonLink: buttonLink2 ?? buttonMobileLink2 ?? '',
      },
    ];
  }

  return [
    {
      buttonTitle: singleButtonTitle ?? '',
      buttonLink: singleButtonLink ?? singleButtonMobileLink ?? '',
    },
  ];
};

export const parsingContentUtil = (record: ExcelRecord) => {
  const contentTitle = record['content_title'];
  const contentDescription = record['content_description'];
  const contentImageUrl = record['content_image_url'];
  const contentWebLink = record['content_web_url'];
  const contentMobileWebLink = record['content_mobile_web_url'];

  return {
    contentTitle,
    contentDescription,
    contentImageUrl,
    contentWebLink,
    contentMobileWebLink,
  };
};

export const parsingTextUtil = (record: ExcelRecord) => {
  const missingRecords = [];

  const text = record['content_text'];
  const webLink = record['content_web_url'];
  const mobileWebLink = record['content_mobile_web_url'];

  const buttons = parsingButtonUtil(record);

  if (!text) {
    missingRecords.push('content_text');
  }

  if (!webLink && !mobileWebLink) {
    missingRecords.push('link');
  }

  return {
    text,
    buttons,
    missingRecords,
  };
};

export const checkLinkData = ({
  record,
  missingData,
}: {
  record: ExcelRecord;
  missingData: Set<string>;
}) => {
  const linkData = {} as ILinkData;

  // ? link : 두 값중 하나만 존재하면 필수
  const webLink = record['content_web_url'];
  const mobileWebLink = record['content_mobile_web_url'];

  // ? link 존재여부 확인
  const hasLink = !!webLink || !!mobileWebLink;

  if (!hasLink) {
    missingData.add('link');
  }

  if (webLink) {
    linkData['webUrl'] = webLink;
  }

  if (mobileWebLink) {
    linkData['mobileWebUrl'] = mobileWebLink;
  }

  return linkData;
};

export const checkButtonsData = (record: ExcelRecord) => {
  const buttonsData: IButtonsData = {};
  const buttons: IButtonData[] = [];

  // ? buttonTitle : 값이 없다면 , '자세히 보기' 가 기본값
  const buttonTitle = record['button_title'];

  // ? buttons : 버튼이 여러개인 경우. buttonTitle 과 같이 사용되는 경우 , buttons 가 우선
  const buttonsTitle1 = record['buttons_title1'];
  const buttonsWebLink1 = record['buttons_web_url1'];
  const buttonsMobileWebLink1 = record['buttons_mobile_web_url1'];

  const buttonsTitle2 = record['buttons_title2'];
  const buttonsWebLink2 = record['buttons_web_url2'];
  const buttonsMobileWebLink2 = record['buttons_mobile_web_url2'];

  // ? 버튼이 완전하게 존재하는 지 , 존재하지 않는지 확인
  const hasButton1 = !!buttonsTitle1 && (!!buttonsWebLink1 || !!buttonsMobileWebLink1);
  const hasButton2 = !!buttonsTitle2 && (!!buttonsWebLink2 || !!buttonsMobileWebLink2);

  if (hasButton1) {
    const linkData = {} as ILinkData;

    if (!!buttonsWebLink1) {
      linkData['webUrl'] = buttonsWebLink1;
    }

    if (!!buttonsMobileWebLink1) {
      linkData['mobileWebUrl'] = buttonsMobileWebLink1;
    }

    buttons.push({
      title: buttonsTitle1,
      link: linkData,
    });
  }

  if (hasButton2) {
    const linkData = {} as ILinkData;

    if (!!buttonsWebLink2) {
      linkData['webUrl'] = buttonsWebLink2;
    }

    if (!!buttonsMobileWebLink2) {
      linkData['mobileWebUrl'] = buttonsMobileWebLink2;
    }

    buttons.push({
      title: buttonsTitle2,
      link: linkData,
    });
  }

  if (!!buttonTitle) {
    buttonsData['buttonTitle'] = buttonTitle;
  }

  if (buttons.length > 0) {
    buttonsData['buttons'] = buttons;
  }

  return buttonsData;
};

export const checkContentData = ({
  record,
  missingData,
}: {
  record: ExcelRecord;
  missingData: Set<string>;
}) => {
  const title = record['content_title'];
  const description = record['content_description'];
  const imageUrl = record['content_image_url'];

  const linkData = checkLinkData({ record, missingData });

  const contentData = {
    link: linkData,
  } as IContentData;

  const hasContentData = !!title || !!description || !!imageUrl;

  if (!hasContentData) {
    missingData.add('content');
  }

  if (!!title) {
    contentData['title'] = title;
  }

  if (!!description) {
    contentData['description'] = description;
  }

  if (!!imageUrl) {
    contentData['imageUrl'] = imageUrl;
  }

  return contentData;
};

export const recordsToText = (record: ExcelRecord) => {
  const missingData = new Set<string>();

  // ? objectType
  const objectType = record['objectType'] as MessageType;

  // ? title : 필수값
  const text = record['content_text'];

  // ? link 값 확인
  const linkData = checkLinkData({ record, missingData });

  // ? button 값 확인
  const buttonsData = checkButtonsData(record);

  if (!text) {
    missingData.add('text');
  }

  const sendData: ITextData = {
    objectType,
    text,
    link: linkData,
    ...buttonsData,
  };

  return {
    sendData,
    missingData,
  };
};

export const recordsToLocation = (record: ExcelRecord) => {
  const missingData = new Set<string>();

  // ? objectType
  const objectType = record['objectType'] as MessageType;

  // ? address 필수 / addressTitle 은 필수 아님
  const address = record['address'];
  const addressTitle = record['address_title'];

  // ? content 확인
  const contentData = checkContentData({ record, missingData });

  // ? button 값 확인
  const buttonsData = checkButtonsData(record);

  if (!address) {
    missingData.add('address');
  }

  const sendData: ILocationData = {
    objectType,
    address,
    content: contentData,
    ...buttonsData,
  };

  if (addressTitle) {
    sendData['addressTitle'] = addressTitle;
  }

  return {
    sendData,
    missingData,
  };
};

export const recordsToFeed = (record: ExcelRecord) => {
  const missingData = new Set<string>();

  // ? objectType
  const objectType = record['objectType'] as MessageType;

  // ? content 확인
  const contentData = checkContentData({ record, missingData });

  // ? button 값 확인
  const buttonsData = checkButtonsData(record);

  const profileText = record['profile_text'];
  const profileImageUrl = record['profile_image_url'];
  const titleImageText = record['profile_image_text'];
  const titleImageUrl = record['title_image_url'];
  const titleImageCategory = record['title_image_category'];

  // todo : 5개까지 존재할 수 있는데 , 일일히 해야하는 불편함이 있음. 이를 한번에 해결할 수 있는지 ?
  const itemData = [];

  const item1 = record['item1'];
  const itemOp1 = record['item_op1'];

  const hasItem1 = !!item1 && !!itemOp1;

  if (hasItem1) {
    itemData.push({
      item: item1,
      itemOp: itemOp1,
    });
  }

  const item2 = record['item2'];
  const itemOp2 = record['item_op2'];

  const hasItem2 = !!item2 && !!itemOp2;

  if (hasItem2) {
    itemData.push({
      item: item2,
      itemOp: itemOp2,
    });
  }

  const item3 = record['item3'];
  const itemOp3 = record['item_op3'];

  const hasItem3 = !!item3 && !!itemOp3;

  if (hasItem3) {
    itemData.push({
      item: item3,
      itemOp: itemOp3,
    });
  }

  const sum = record['sum'];
  const sumOp = record['sum_op'];

  const sendData: any = {
    objectType,
    content: contentData,
    ...buttonsData,
  };

  const itemContent: any = {};

  if (!!profileText) {
    itemContent['profileText'] = profileText;
  }

  if (!!profileImageUrl) {
    itemContent['profileImageUrl'] = profileImageUrl;
  }

  if (!!titleImageText) {
    itemContent['titleImageText'] = titleImageText;
  }

  if (!!titleImageUrl) {
    itemContent['titleImageUrl'] = titleImageUrl;
  }

  if (!!titleImageCategory) {
    itemContent['titleImageCategory'] = titleImageCategory;
  }

  if (!!sum) {
    itemContent['sum'] = sum;
  }

  if (!!sumOp) {
    itemContent['sumOp'] = sumOp;
  }

  if (itemData.length > 0) {
    itemContent['items'] = itemData;
  }

  sendData['itemContent'] = itemContent;

  return {
    sendData,
    missingData,
  };
};

export const recordsToList = (record: ExcelRecord) => {
  const missingData = new Set<string>();

  // ? objectType
  const objectType = record['objectType'] as MessageType;

  // ? headerTitle 필수값
  const headerTitle = record['header_title'];

  // ? link 값 확인
  const headerLink = checkLinkData({ record, missingData });

  // ? button 값 확인
  const buttonsData = checkButtonsData(record);

  // ? contents 값 확인
  const contents = [];

  const title1 = record['content_title1'];
  const description1 = record['content_description1'];
  const imageUrl1 = record['content_image_url1'];
  const webLink1 = record['content_web_url1'];
  const mobileWebLink1 = record['content_mobile_web_url1'];

  const hasLink1 = !!webLink1 || !!mobileWebLink1;
  const hasContentData1 = (!!title1 || !!description1 || !!imageUrl1) && hasLink1;

  const title2 = record['content_title2'];
  const description2 = record['content_description2'];
  const imageUrl2 = record['content_image_url2'];
  const webLink2 = record['content_web_url2'];
  const mobileWebLink2 = record['content_mobile_web_url2'];

  const hasLink2 = !!webLink2 || !!mobileWebLink2;
  const hasContentData2 = (!!title2 || !!description2 || !!imageUrl2) && hasLink2;

  const title3 = record['content_title3'];
  const description3 = record['content_description3'];
  const imageUrl3 = record['content_image_url3'];
  const webLink3 = record['content_web_url3'];
  const mobileWebLink3 = record['content_mobile_web_url3'];

  const hasLink3 = !!webLink3 || !!mobileWebLink3;
  const hasContentData3 = (!!title3 || !!description3 || !!imageUrl3) && hasLink3;

  // todo : checkContentData 재사용 방안 고민
  if (hasContentData1) {
    const linkData = {} as ILinkData;

    if (webLink1) {
      linkData['webUrl'] = webLink1;
    }

    if (mobileWebLink1) {
      linkData['mobileWebUrl'] = mobileWebLink1;
    }

    const contentData = {
      link: linkData,
    } as IContentData;

    if (!!title1) {
      contentData['title'] = title1;
    }

    if (!!description1) {
      contentData['description'] = description1;
    }

    if (!!imageUrl1) {
      contentData['imageUrl'] = imageUrl1;
    }

    contents.push(contentData);
  }

  if (hasContentData2) {
    const linkData = {} as ILinkData;

    if (webLink2) {
      linkData['webUrl'] = webLink2;
    }

    if (mobileWebLink2) {
      linkData['mobileWebUrl'] = mobileWebLink2;
    }

    const contentData = {
      link: linkData,
    } as IContentData;

    if (!!title2) {
      contentData['title'] = title2;
    }

    if (!!description2) {
      contentData['description'] = description2;
    }

    if (!!imageUrl2) {
      contentData['imageUrl'] = imageUrl2;
    }

    contents.push(contentData);
  }

  if (hasContentData3) {
    const linkData = {} as ILinkData;

    if (webLink3) {
      linkData['webUrl'] = webLink3;
    }

    if (mobileWebLink3) {
      linkData['mobileWebUrl'] = mobileWebLink3;
    }

    const contentData = {
      link: linkData,
    } as IContentData;

    if (!!title3) {
      contentData['title'] = title3;
    }

    if (!!description3) {
      contentData['description'] = description3;
    }

    if (!!imageUrl3) {
      contentData['imageUrl'] = imageUrl3;
    }

    contents.push(contentData);
  }

  if (!!headerTitle) {
    missingData.add('headerTitle');
  }

  if (contents.length < 2) {
    missingData.add('contents');
  }

  const sendData: any = {
    objectType,
    headerTitle,
    link: headerLink,
    ...buttonsData,
    contents,
  };

  return {
    sendData,
    missingData,
  };
};

export const recordsToCommerce = (record: ExcelRecord) => {
  const missingData = new Set<string>();

  // ? objectType
  const objectType = record['objectType'] as MessageType;

  // ? content 확인
  const content = checkContentData({ record, missingData });

  // ? button 값 확인
  const buttonsData = checkButtonsData(record);

  // todo : 숫자 정규식 검사 필요

  const productName = record['product_name']; // 필수 아님
  const regularPrice = record['regular_price']; // 필수
  const discountPrice = record['discount_price']; // 필수 아님
  const discountRate = record['discount_rate']; // 필수 아님
  const fixedDiscountPrice = record['fixed_discount_price']; // 필수 아님
  const currency_unit = record['currency_unit']; // 필수 아님
  const currencyUnitPosition = record['currency_unit_position']; // 필수 아님

  if (!!regularPrice) {
    missingData.add('regularPrice');
  }

  const commerce: any = {
    regularPrice,
  };

  if (!!productName) {
    commerce['productName'] = productName;
  }

  if (!!discountPrice) {
    commerce['discountPrice'] = discountPrice;
  }

  if (!!discountRate) {
    commerce['discountRate'] = discountRate;
  }

  if (!!fixedDiscountPrice) {
    commerce['fixedDiscountPrice'] = fixedDiscountPrice;
  }

  if (!!currency_unit) {
    commerce['currency_unit'] = currency_unit;
  }

  if (!!currencyUnitPosition) {
    commerce['currencyUnitPosition'] = currencyUnitPosition;
  }

  const sendData: any = {
    objectType,
    content,
    commerce,
    ...buttonsData,
  };

  return {
    sendData,
    missingData,
  };
};

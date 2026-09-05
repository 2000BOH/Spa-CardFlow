import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // 모바일 뷰포트 설정
    await page.setViewport({ width: 390, height: 844 });
    
    console.log('Connecting to localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    
    console.log('Clicking "직접 입력하기" button...');
    const buttons = await page.$$('button');
    let clicked = false;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('직접 입력하기')) {
        await btn.click();
        clicked = true;
        break;
      }
    }
    
    if (!clicked) {
      console.log('Button not found!');
    }
    
    // 애니메이션 대기
    await new Promise(r => setTimeout(r, 1000));
    
    // 스크롤 약간 내리기 (결제금액/사용구분 부분 포커스)
    await page.evaluate(() => window.scrollBy(0, 200));
    
    console.log('Taking screenshot...');
    await page.screenshot({ 
      path: '/Users/toondran/.gemini/antigravity-ide/brain/7064a743-41dd-45ec-9fbf-0a5e11632301/expense_form_ui.png',
      fullPage: false
    });
    
    await browser.close();
    console.log('Done!');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

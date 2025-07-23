const moment = require("moment-timezone");

result.recordset.forEach((item) => {
  if (item.giohen) {
    // Đảm bảo giờ hiển thị đúng múi giờ Việt Nam
    item.giohen = moment(item.giohen).tz("Asia/Ho_Chi_Minh").format("HH:mm:ss");
  }
});

# 端到端按钮走查：按 UI 中每个按钮实际发出的请求顺序执行，输出 PASS/FAIL
$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:5173/api"
$results = New-Object System.Collections.Generic.List[object]
function Step($name, $scriptBlock) {
  try {
    $scriptBlock.Invoke()
    $results.Add([pscustomobject]@{ Step = $name; Result = "PASS" })
  } catch {
    $msg = $_.Exception.Message
    if ($_.ErrorDetails.Message) { $msg = $_.ErrorDetails.Message }
    $results.Add([pscustomobject]@{ Step = $name; Result = "FAIL: $msg" })
  }
}
function Call($method, $path, $body, $token) {
  $headers = @{}
  if ($token) { $headers.Authorization = "Bearer $token" }
  $params = @{ Method = $method; Uri = "$base$path"; Headers = $headers }
  if ($null -ne $body) { $params.ContentType = "application/json"; $params.Body = ($body | ConvertTo-Json -Depth 10) }
  return Invoke-RestMethod @params
}
# 0. 未登录访问 /auth/me 应 401
Step "访客查看身份被拒(401)" {
  try { Call "GET" "/auth/me" $null $null; throw "expected 401" } catch { if ($_.Exception.Response.StatusCode.value__ -ne 401) { throw "got $($_.Exception.Response.StatusCode.value__)" } }
}
# 1. 登录弹窗按钮：错误密码登录 / 学生登录 / 管理员登录
Step "错误密码登录被拒(401)" {
  try { Call "POST" "/auth/login" @{ studentId = "20260001"; password = "wrong" } $null; throw "expected 401" } catch { if ($_.Exception.Response.StatusCode.value__ -ne 401) { throw "got $($_.Exception.Response.StatusCode.value__)" } }
}
$lin = Call "POST" "/auth/login" @{ studentId = "20260001"; password = "Campus123!" } $null
Step "学生林同学登录" { if (-not $lin.token -or $lin.user.name -ne "林同学") { throw "登录结果异常" } }
$chen = Call "POST" "/auth/login" @{ studentId = "20260002"; password = "Campus123!" } $null
Step "学生陈同学登录" { if (-not $chen.token) { throw "无 token" } }
$admin = Call "POST" "/auth/login" @{ studentId = "admin"; password = "Campus123!" } $null
Step "管理员登录" { if ($admin.user.role -ne "admin") { throw "角色异常" } }
# 2. 注册按钮（新账号）
$suffix = Get-Random -Minimum 10000 -Maximum 99999
$newId = "test$suffix"
$reg = Call "POST" "/auth/register" @{ name = "测试同学"; studentId = $newId; password = "Abc12345" } $null
Step "注册新账号" { if ($reg.user.studentId -ne $newId) { throw "学号不符" } }
# 3. 广场页：统计 / 筛选 / 搜索 / 分页
Step "广场统计" { $s = Call "GET" "/stats" $null $null; if ($null -eq $s.total) { throw "无 total" } }
Step "搜索+分类+校区+分页" {
  $p = Call "GET" "/items?q=%E9%9B%A8%E4%BC%9E&type=found&category=%E7%94%9F%E6%B4%BB%E7%94%A8%E5%93%81&campus=%E5%8D%97%E6%B9%96%E6%A0%A1%E5%8C%BA&page=1&pageSize=9" $null $null
  if ($p.items.Count -lt 1) { throw "筛选无结果" }
}
Step "第二页无重复" {
  $p1 = Call "GET" "/items?page=1&pageSize=9" $null $null
  $p2 = Call "GET" "/items?page=2&pageSize=9" $null $null
  if ($p1.items.Count -eq 0 -or $p2.items.Count -eq 0) { throw "分页为空" }
  if (($p1.items.id | Where-Object { $_ -in $p2.items.id }).Count -gt 0) { throw "跨页重复" }
}
# 4. 详情弹窗：物品详情 + 规则匹配(F09)
Step "物品详情" { $d = Call "GET" "/items/i-umbrella" $null $null; if ($d.title -notlike "*雨伞*") { throw "标题不符" } }
Step "规则匹配F09" {
  $m = Call "GET" "/items/i-umbrella/matches" $null $null
  if ($m.Count -lt 1) { throw "无匹配" }
  if ($m[0].item.type -ne "lost") { throw "匹配类型错误" }
}
# 5. 发布页按钮（新建→编辑→撤回）
$pub = Call "POST" "/items" @{ type = "found"; title = "测试拾到的水杯"; category = "生活用品"; location = "测试教学楼"; campus = "南湖校区"; occurredAt = "2026-10-29"; description = "一个测试用的水杯，用于走查发布按钮。" } $lin.token
Step "发布招领(待审)" { if ($pub.reviewStatus -ne "pending") { throw "非待审" } }
$edited = Call "PATCH" "/items/$($pub.id)" @{ type = "found"; title = "测试拾到的水杯改"; category = "生活用品"; location = "测试教学楼B"; campus = "南湖校区"; occurredAt = "2026-10-29"; description = "编辑后的测试水杯描述。" } $lin.token
Step "编辑本人发布(回待审)" { if ($edited.reviewStatus -ne "pending") { throw "编辑后未回待审" } }
$wd = Call "POST" "/items/$($pub.id)/withdraw" @{} $lin.token
Step "撤回本人发布" { if ($wd.status -ne "withdrawn") { throw "未撤回" } }
Step "他人撤回被拒(403)" {
  $pub2 = Call "POST" "/items" @{ type = "lost"; title = "测试丢失的钥匙"; category = "其他物品"; location = "测试操场"; campus = "南湖校区"; occurredAt = "2026-10-29"; description = "测试用的丢失钥匙描述。" } $lin.token
  try { Call "POST" "/items/$($pub2.id)/withdraw" @{} $chen.token; throw "expected 403" } catch { if ($_.Exception.Response.StatusCode.value__ -ne 403) { throw "got $($_.Exception.Response.StatusCode.value__)" } }
}
# 6. 管理员审核按钮(F10)
Step "学生访问管理接口被拒(403)" {
  try { Call "GET" "/admin/items" $null $lin.token; throw "expected 403" } catch { if ($_.Exception.Response.StatusCode.value__ -ne 403) { throw "got $($_.Exception.Response.StatusCode.value__)" } }
}
$admItems = Call "GET" "/admin/items?reviewStatus=pending" $null $admin.token
Step "管理员查看待审列表" { if ($admItems.Count -lt 1) { throw "无待审" } }
$target = $admItems[0]
Step "管理员审核通过" {
  $r = Call "POST" "/admin/items/$($target.id)/review" @{ action = "approve" } $admin.token
  if ($r.reviewStatus -ne "approved") { throw "未通过" }
}
Step "管理员驳回/下架" {
  $r = Call "POST" "/admin/items/$($target.id)/review" @{ action = "reject"; reason = "测试驳回原因" } $admin.token
  if ($r.reviewStatus -ne "rejected") { throw "未驳回" }
}
# 7. 认领流程按钮(F07)：申请→拒绝→重申请→通过→取消→重申请→通过→完成
$found = Call "GET" "/items?type=found&pageSize=50" $null $null
$claimItem = $found.items | Where-Object { $_.ownerId -ne $lin.user.id } | Select-Object -First 1
if (-not $claimItem) { $claimItem = $found.items[0] }
$c1 = Call "POST" "/claims" @{ itemId = $claimItem.id; proof = "这是走查用的认领证明，描述物品特征。" } $lin.token
Step "提交认领申请" { if ($c1.status -ne "pending") { throw "状态异常" } }
Step "重复申请被拒(409)" {
  try { Call "POST" "/claims" @{ itemId = $claimItem.id; proof = "重复申请证明。" } $lin.token; throw "expected 409" } catch { if ($_.Exception.Response.StatusCode.value__ -ne 409) { throw "got $($_.Exception.Response.StatusCode.value__)" } }
}
# 第三人访问消息被拒(403) —— 需要一个第三人，用测试账号
Step "第三人查看认领消息被拒(403)" {
  try { Call "GET" "/claims/$($c1.id)/messages" $null $reg.token; throw "expected 403" } catch { if ($_.Exception.Response.StatusCode.value__ -ne 403) { throw "got $($_.Exception.Response.StatusCode.value__)" } }
}
Step "申请人不能核验(403)" {
  try { Call "POST" "/claims/$($c1.id)/action" @{ action = "approve" } $lin.token; throw "expected 403" } catch { if ($_.Exception.Response.StatusCode.value__ -ne 403) { throw "got $($_.Exception.Response.StatusCode.value__)" } }
}
$ownerToken = if ($claimItem.ownerId -eq $chen.user.id) { $chen.token } else { $lin.token }
Step "发布者拒绝申请" {
  $r = Call "POST" "/claims/$($c1.id)/action" @{ action = "reject" } $ownerToken
  if ($r.status -ne "rejected") { throw "未拒绝" }
}
# 重新申请并走完整链路
$c2 = Call "POST" "/claims" @{ itemId = $claimItem.id; proof = "第二次申请的走查证明。" } $lin.token
Step "重新申请(拒绝后可再申请)" { if ($c2.status -ne "pending") { throw "状态异常" } }
$msg1 = Call "POST" "/claims/$($c2.id)/messages" @{ content = "你好，请问物品特征？" } $lin.token
Step "发送站内消息(F08)" { if ($msg1.content -ne "你好，请问物品特征？") { throw "内容不符" } }
$msgs = Call "GET" "/claims/$($c2.id)/messages" $null $ownerToken
Step "对方读取消息" { if ($msgs.Count -lt 1) { throw "无消息" } }
$apr = Call "POST" "/claims/$($c2.id)/action" @{ action = "approve" } $ownerToken
Step "发布者核验通过" { if ($apr.status -ne "approved") { throw "未通过" } }
Step "发布者再次核验被拒(409)" {
  try { Call "POST" "/claims/$($c2.id)/action" @{ action = "approve" } $ownerToken; throw "expected 409" } catch { if ($_.Exception.Response.StatusCode.value__ -ne 409) { throw "got $($_.Exception.Response.StatusCode.value__)" } }
}
Step "争议报告(F11入口)" {
  $d = Call "POST" "/disputes" @{ claimId = $c2.id; reason = "走查测试争议：双方对物品描述有分歧。" } $lin.token
  if ($d.status -ne "open") { throw "未开案" }
}
Step "第三人报告争议被拒(403)" {
  try { Call "POST" "/disputes" @{ claimId = $c2.id; reason = "第三人越权报告争议。" } $reg.token; throw "expected 403" } catch { if ($_.Exception.Response.StatusCode.value__ -ne 403) { throw "got $($_.Exception.Response.StatusCode.value__)" } }
}
$comp = Call "POST" "/claims/$($c2.id)/action" @{ action = "complete" } $lin.token
Step "申请人确认领取完成" {
  if ($comp.status -ne "completed") { throw "未完成" }
  $it = Call "GET" "/items/$($claimItem.id)" $null $null
  if ($it.status -ne "claimed") { throw "物品未同步为已归还" }
}
Step "完成后消息通道关闭(后端禁发)" {
  try { Call "POST" "/claims/$($c2.id)/messages" @{ content = "完成后还想发消息" } $lin.token; throw "expected failure" } catch { $code = $_.Exception.Response.StatusCode.value__; if ($code -ne 409 -and $code -ne 403) { throw "got $code" } }
}
# 8. 管理员争议处理按钮(F11)
$admDisp = Call "GET" "/admin/disputes" $null $admin.token
Step "管理员查看争议" { if ($admDisp.Count -lt 1) { throw "无争议" } }
$openDisp = $admDisp | Where-Object { $_.status -eq "open" } | Select-Object -First 1
Step "管理员记录处理结果" {
  $r = Call "POST" "/admin/disputes/$($openDisp.id)/resolve" @{ resolution = "走查测试：已协调双方，记录处理结论。" } $admin.token
  if ($r.status -ne "resolved") { throw "未解决" }
}
# 9. 备份恢复按钮(F12)
$bk = Call "POST" "/admin/backups" @{} $admin.token
Step "创建备份" { if (-not $bk.id) { throw "无备份id" } }
Step "未确认恢复被拒(400)" {
  try { Call "POST" "/admin/backups/$($bk.id)/restore" @{ confirm = $false } $admin.token; throw "expected 400" } catch { if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw "got $($_.Exception.Response.StatusCode.value__)" } }
}
Step "恢复备份(confirm=true)" {
  $r = Call "POST" "/admin/backups/$($bk.id)/restore" @{ confirm = $true } $admin.token
  if ($r.ok -ne $true) { throw "未恢复" }
}
# 10. 个人中心按钮(F02/F03)
Step "修改个人资料" {
  $u = Call "PATCH" "/users/me" @{ name = "林同学"; phone = "13800138000" } $lin.token
  if ($u.phone -ne "13800138000") { throw "电话未保存" }
}
Step "10位手机号被拒(400)" {
  try { Call "PATCH" "/users/me" @{ phone = "1380013800" } $lin.token; throw "expected 400" } catch { if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw "got $($_.Exception.Response.StatusCode.value__)" } }
}
Step "绑定演示校园身份" {
  $u = Call "PATCH" "/users/me" @{ verified = $true } $lin.token
  if ($u.verified -ne $true) { throw "未绑定" }
}
Step "我的发布记录(F03)" {
  $mine = Call "GET" "/items?mine=true&page=1&pageSize=9" $null $lin.token
  if ($mine.items.Count -lt 1) { throw "无记录" }
}
Step "我的认领列表(F03)" {
  $cls = Call "GET" "/claims" $null $lin.token
  if ($cls.Count -lt 1) { throw "无认领" }
}
# 11. 退出登录按钮
Step "退出登录" {
  Call "POST" "/auth/logout" @{} $lin.token
  try { Call "GET" "/auth/me" $null $lin.token; throw "expected 401" } catch { if ($_.Exception.Response.StatusCode.value__ -ne 401) { throw "会话未失效" } }
}
$results | Format-Table -AutoSize | Out-String -Width 200
$failed = $results | Where-Object { $_.Result -like "FAIL*" }
"TOTAL: $($results.Count)  PASS: $(($results | Where-Object { $_.Result -eq 'PASS' }).Count)  FAIL: $($failed.Count)"
